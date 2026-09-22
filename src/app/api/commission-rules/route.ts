import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const ruleSchema = z.object({
  professionalUserId: z.string().min(1),
  procedureId: z.string().optional().nullable(), // null = regra geral (vale pra qualquer procedimento)
  percentage: z.number().min(0).max(100),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.COMMISSIONS_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rules = await withTenantContext(user.organizationId, (tx) =>
    tx.commissionRule.findMany({
      where: { organizationId: user.organizationId },
      include: { procedure: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    })
  );

  // Nomes dos profissionais — CommissionRule só guarda o id do User,
  // então buscamos os nomes à parte pra exibir na lista.
  const professionalIds = Array.from(new Set(rules.map((r) => r.professionalUserId)));
  const professionals = professionalIds.length
    ? await withTenantContext(user.organizationId, (tx) =>
        tx.user.findMany({ where: { id: { in: professionalIds } }, select: { id: true, name: true } })
      )
    : [];
  const nameById = new Map(professionals.map((p) => [p.id, p.name]));

  return NextResponse.json({
    rules: rules.map((r) => ({ ...r, professionalName: nameById.get(r.professionalUserId) ?? "—" })),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.COMMISSIONS_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    // Evita duas regras pro mesmo profissional + mesmo procedimento (ou
    // duas regras gerais pro mesmo profissional) — a mais nova substitui.
    const existing = await tx.commissionRule.findFirst({
      where: {
        organizationId: user.organizationId,
        professionalUserId: parsed.data.professionalUserId,
        procedureId: parsed.data.procedureId || null,
      },
    });
    if (existing) {
      await tx.commissionRule.delete({ where: { id: existing.id } });
    }

    return tx.commissionRule.create({
      data: {
        organizationId: user.organizationId,
        professionalUserId: parsed.data.professionalUserId,
        procedureId: parsed.data.procedureId || null,
        percentage: parsed.data.percentage,
      },
      include: { procedure: { select: { id: true, name: true } } },
    });
  });

  return NextResponse.json({ rule: result }, { status: 201 });
}

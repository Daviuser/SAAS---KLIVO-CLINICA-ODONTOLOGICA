import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

// O orçamento é só uma PROPOSTA — vira PDF pra mandar ao paciente, mas
// não gera nada no financeiro por conta própria. A cobrança de verdade
// só nasce quando uma consulta com procedimento vinculado é concluída
// na Agenda (ver src/app/api/appointments/[id]/route.ts). Isso evita
// cobrar o paciente duas vezes (uma pelo orçamento, outra pela consulta).
const statusChangeSchema = z.object({
  status: z.enum(["sent", "approved", "rejected"]),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.BUDGETS_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const budget = await withTenantContext(user.organizationId, (tx) =>
    tx.budget.findUnique({
      where: { id: params.id },
      include: { items: true, patient: true },
    })
  );

  if (!budget) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  try {
    assertSameOrganization(budget.organizationId, user.organizationId);
  } catch {
    return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ budget });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.BUDGETS_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = statusChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.budget.findUnique({ where: { id: params.id } });
    if (!existing) return { notFound: true as const };
    assertSameOrganization(existing.organizationId, user.organizationId);

    if (existing.status === "approved") {
      throw new Error("ALREADY_APPROVED");
    }

    const updated = await tx.budget.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: `budget.${parsed.data.status}`,
        entityType: "Budget",
        entityId: updated.id,
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });

    return { budget: updated };
  }).catch((e) => {
    if (e.message === "ALREADY_APPROVED") return { alreadyApproved: true as const };
    throw e;
  });

  if ("notFound" in result) return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
  if ("alreadyApproved" in result) {
    return NextResponse.json({ error: "Este orçamento já foi aprovado" }, { status: 409 });
  }

  return NextResponse.json(result);
}

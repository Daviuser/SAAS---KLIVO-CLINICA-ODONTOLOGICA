import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { budgetSchema } from "@/lib/validation/budget";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.BUDGETS_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient) return { notFound: true as const };
    assertSameOrganization(patient.organizationId, user.organizationId);

    const budgets = await tx.budget.findMany({
      where: { patientId: params.id },
      include: { items: true, receivable: true },
      orderBy: { createdAt: "desc" },
    });
    return { budgets };
  });

  if ("notFound" in result) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  return NextResponse.json(result);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.BUDGETS_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient) return { notFound: true as const };
    assertSameOrganization(patient.organizationId, user.organizationId);

    // Busca os procedimentos escolhidos para tirar o "snapshot" de nome/preço
    const procedureIds = parsed.data.items.map((i) => i.procedureId);
    const procedures = await tx.procedure.findMany({ where: { id: { in: procedureIds } } });
    const procedureById = new Map(procedures.map((p) => [p.id, p]));

    for (const item of parsed.data.items) {
      const proc = procedureById.get(item.procedureId);
      if (!proc) throw new Error(`Procedimento ${item.procedureId} não encontrado`);
    }

    const budget = await tx.budget.create({
      data: {
        organizationId: user.organizationId,
        patientId: params.id,
        professionalUserId: parsed.data.professionalUserId || null,
        notes: parsed.data.notes || null,
        status: "draft",
        items: {
          create: parsed.data.items.map((item) => {
            const proc = procedureById.get(item.procedureId)!;
            const unitPrice = Number(proc.defaultPrice);
            const total = unitPrice * item.quantity - item.discount;
            return {
              organizationId: user.organizationId,
              procedureId: proc.id,
              procedureName: proc.name,
              quantity: item.quantity,
              unitPrice,
              discount: item.discount,
              total,
            };
          }),
        },
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "budget.create",
        entityType: "Budget",
        entityId: budget.id,
        after: budget as any,
      },
    });

    return { budget };
  });

  if ("notFound" in result) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  return NextResponse.json(result, { status: 201 });
}

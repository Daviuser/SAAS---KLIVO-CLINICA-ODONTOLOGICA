import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { appointmentUpdateSchema } from "@/lib/validation/appointment";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = appointmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const appointment = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.appointment.findUnique({
      where: { id: params.id },
      include: { receivable: true, procedure: true },
    });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    const updated = await tx.appointment.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      },
      include: {
        patient: { select: { id: true, name: true } },
        resource: { select: { id: true, name: true } },
        procedure: { select: { id: true, name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "appointment.update",
        entityType: "Appointment",
        entityId: updated.id,
        before: existing as any,
        after: updated as any,
      },
    });

    // Ao CONCLUIR uma consulta que tem procedimento definido e ainda não
    // tem cobrança gerada, cria automaticamente a conta a receber (1
    // parcela, vencimento hoje, status pendente). Isso é o que faz o
    // financeiro/relatórios/dashboard refletirem o atendimento na hora.
    // Não gera nada se: não mudou pra "concluida" agora, não tem
    // procedimento vinculado, ou já existe cobrança pra essa consulta
    // (evita duplicar se o status for alternado pra frente e pra trás).
    let receivable = null;
    const justCompleted = parsed.data.status === "concluida" && existing.status !== "concluida";
    if (justCompleted && existing.procedureId && existing.procedure && !existing.receivable) {
      receivable = await tx.receivable.create({
        data: {
          organizationId: user.organizationId,
          patientId: existing.patientId,
          appointmentId: existing.id,
          description: `Atendimento concluído — ${existing.procedure.name}`,
          totalAmount: existing.procedure.defaultPrice,
          installments: {
            create: [
              {
                organizationId: user.organizationId,
                number: 1,
                amount: existing.procedure.defaultPrice,
                dueDate: new Date(),
              },
            ],
          },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "receivable.create_from_appointment",
          entityType: "Receivable",
          entityId: receivable.id,
          after: receivable as any,
        },
      });
    }

    return { ...updated, generatedReceivable: receivable };
  });

  if (!appointment) return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
  return NextResponse.json({ appointment });
}

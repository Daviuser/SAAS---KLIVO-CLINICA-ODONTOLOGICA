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

  // Concluir um atendimento é uma ação clínica distinta de agendar/
  // remarcar/cancelar — exige AGENDA_COMPLETE (Admin e Dentista por
  // padrão; recepção tem AGENDA_WRITE mas não conclui atendimentos).
  if (parsed.data.status === "concluida") {
    const canComplete = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_COMPLETE);
    if (!canComplete) {
      return NextResponse.json({ error: "Sem permissão para concluir atendimentos" }, { status: 403 });
    }
  }

  const appointment = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.appointment.findUnique({
      where: { id: params.id },
      include: { receivable: true, procedure: true },
    });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    // Um dentista só pode alterar (remarcar, confirmar, concluir,
    // cancelar) as PRÓPRIAS consultas — nunca as de outro profissional,
    // mesmo sabendo o id da consulta. Quem pode ver/mexer na agenda de
    // todo mundo (admin, recepção, gestor) segue sem essa restrição.
    if (user.roleName === "Profissional" && existing.professionalUserId !== user.id) {
      throw new Error("FORBIDDEN_CROSS_TENANT_ACCESS");
    }

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

    // ------------------------------------------------------------
    // Ao CONCLUIR uma consulta com procedimento vinculado, o pagamento
    // é registrado IMEDIATAMENTE como recebido — sem etapa de "conta a
    // receber pendente" nem baixa manual depois. A clínica trabalha no
    // regime de caixa (recebe no ato do atendimento), então:
    //   1. cria a conta a receber já com status "paid" e a parcela já
    //      com paidAt preenchido;
    //   2. calcula a comissão do profissional na mesma transação,
    //      priorizando regra específica do procedimento sobre a regra
    //      geral do profissional.
    // A trava `!existing.receivable` garante que isso só acontece UMA
    // vez por consulta, mesmo que o status seja alternado várias vezes
    // (evita comissão/recebimento duplicado).
    // ------------------------------------------------------------
    let receivable = null;
    let commissionEntry = null;
    const justCompleted = parsed.data.status === "concluida" && existing.status !== "concluida";

    if (justCompleted && existing.procedureId && existing.procedure && !existing.receivable) {
      const paidAt = new Date();

      receivable = await tx.receivable.create({
        data: {
          organizationId: user.organizationId,
          patientId: existing.patientId,
          appointmentId: existing.id,
          description: `Atendimento concluído — ${existing.procedure.name}`,
          totalAmount: existing.procedure.defaultPrice,
          status: "paid",
          installments: {
            create: [
              {
                organizationId: user.organizationId,
                number: 1,
                amount: existing.procedure.defaultPrice,
                dueDate: paidAt,
                paidAt,
                status: "paid",
              },
            ],
          },
        },
        include: { installments: true },
      });

      const installment = receivable.installments[0];

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

      // Comissão: regra específica do procedimento tem prioridade sobre
      // a regra geral do profissional (procedureId nulo).
      const professionalUserId = existing.professionalUserId;
      const procedureId = existing.procedureId;

      const specificRule = await tx.commissionRule.findFirst({
        where: { organizationId: user.organizationId, professionalUserId, procedureId },
      });
      const rule =
        specificRule ??
        (await tx.commissionRule.findFirst({
          where: { organizationId: user.organizationId, professionalUserId, procedureId: null },
        }));

      if (rule) {
        const amount = (Number(installment.amount) * Number(rule.percentage)) / 100;
        commissionEntry = await tx.commissionEntry.create({
          data: {
            organizationId: user.organizationId,
            professionalUserId,
            receivableInstallmentId: installment.id,
            procedureId,
            percentageApplied: rule.percentage,
            amount,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "commission_entry.create",
            entityType: "CommissionEntry",
            entityId: commissionEntry.id,
            after: commissionEntry as any,
          },
        });
      }
    }

    return { ...updated, generatedReceivable: receivable, generatedCommission: commissionEntry };
  }).catch((e) => {
    if (e.message === "FORBIDDEN_CROSS_TENANT_ACCESS") return { forbidden: true as const };
    throw e;
  });

  if (!appointment) return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
  if ("forbidden" in appointment) {
    return NextResponse.json({ error: "Você só pode alterar as próprias consultas" }, { status: 403 });
  }
  return NextResponse.json({ appointment });
}

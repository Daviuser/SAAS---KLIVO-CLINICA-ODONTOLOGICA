import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const paySchema = z.object({
  paymentMethod: z.enum(["dinheiro", "pix", "cartao_credito", "cartao_debito", "boleto"]),
  paidAt: z.string().datetime().optional(), // default: agora
});

export async function PATCH(
  req: Request,
  { params }: { params: { receivableId: string; installmentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.FINANCIAL_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const installment = await tx.receivableInstallment.findUnique({
      where: { id: params.installmentId },
      include: { receivable: { include: { budget: true, appointment: true, installments: true } } },
    });
    if (!installment || installment.receivableId !== params.receivableId) return { notFound: true as const };
    assertSameOrganization(installment.organizationId, user.organizationId);

    if (installment.status === "paid") {
      throw new Error("ALREADY_PAID");
    }

    const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();

    const updatedInstallment = await tx.receivableInstallment.update({
      where: { id: params.installmentId },
      data: { status: "paid", paidAt, paymentMethod: parsed.data.paymentMethod },
    });

    // Recalcula status da conta a receber como um todo
    const allInstallments = installment.receivable.installments.map((i) =>
      i.id === updatedInstallment.id ? updatedInstallment : i
    );
    const allPaid = allInstallments.every((i) => i.status === "paid");
    const anyPaid = allInstallments.some((i) => i.status === "paid");
    await tx.receivable.update({
      where: { id: installment.receivableId },
      data: { status: allPaid ? "paid" : anyPaid ? "partially_paid" : "pending" },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "receivable_installment.pay",
        entityType: "ReceivableInstallment",
        entityId: updatedInstallment.id,
        after: updatedInstallment as any,
      },
    });

    // Comissão: identificamos o profissional responsável (via consulta
    // que gerou a cobrança — hoje o único fluxo que cria conta a
    // receber) e o procedimento dela. Damos preferência a uma regra
    // específica pra aquele procedimento; se não houver, caímos pra
    // regra geral do profissional (procedureId nulo).
    let commissionEntry = null;
    const professionalUserId =
      installment.receivable.budget?.professionalUserId ??
      installment.receivable.appointment?.professionalUserId;
    const procedureId = installment.receivable.appointment?.procedureId ?? null;

    if (professionalUserId) {
      const specificRule = procedureId
        ? await tx.commissionRule.findFirst({
            where: { organizationId: user.organizationId, professionalUserId, procedureId },
          })
        : null;
      const rule =
        specificRule ??
        (await tx.commissionRule.findFirst({
          where: { organizationId: user.organizationId, professionalUserId, procedureId: null },
        }));

      if (rule) {
        const amount = (Number(updatedInstallment.amount) * Number(rule.percentage)) / 100;
        commissionEntry = await tx.commissionEntry.create({
          data: {
            organizationId: user.organizationId,
            professionalUserId,
            receivableInstallmentId: updatedInstallment.id,
            procedureId,
            percentageApplied: rule.percentage,
            amount,
          },
        });
      }
    }

    return { installment: updatedInstallment, commissionEntry };
  }).catch((e) => {
    if (e.message === "ALREADY_PAID") return { alreadyPaid: true as const };
    throw e;
  });

  if ("notFound" in result) return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
  if ("alreadyPaid" in result) return NextResponse.json({ error: "Parcela já estava paga" }, { status: 409 });

  return NextResponse.json(result);
}

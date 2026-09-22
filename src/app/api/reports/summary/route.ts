import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.REPORTS_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : (() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  })();
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  const result = await withTenantContext(user.organizationId, async (tx) => {
    // Faturamento do período: parcelas pagas com paidAt dentro do intervalo
    const paidInstallments = await tx.receivableInstallment.findMany({
      where: {
        organizationId: user.organizationId,
        status: "paid",
        paidAt: { gte: from, lte: to },
      },
      include: {
        receivable: { include: { budget: true, appointment: true } },
      },
    });

    const totalRevenue = paidInstallments.reduce((sum, i) => sum + Number(i.amount), 0);

    // Agrupa faturamento por dia para o gráfico de barras
    const revenueByDayMap = new Map<string, number>();
    for (const inst of paidInstallments) {
      const dayKey = inst.paidAt!.toISOString().slice(0, 10);
      revenueByDayMap.set(dayKey, (revenueByDayMap.get(dayKey) ?? 0) + Number(inst.amount));
    }
    const revenueByDay = Array.from(revenueByDayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Produção por profissional: soma das parcelas pagas cujo orçamento
    // tem um profissional responsável definido (via orçamento ou via
    // consulta concluída que gerou a cobrança diretamente)
    const productionMap = new Map<string, number>();
    for (const inst of paidInstallments) {
      const profId =
        inst.receivable.budget?.professionalUserId ?? inst.receivable.appointment?.professionalUserId;
      if (!profId) continue;
      productionMap.set(profId, (productionMap.get(profId) ?? 0) + Number(inst.amount));
    }
    const professionalIds = Array.from(productionMap.keys());
    const professionals = professionalIds.length
      ? await tx.user.findMany({ where: { id: { in: professionalIds } }, select: { id: true, name: true } })
      : [];
    const professionalNameById = new Map(professionals.map((p) => [p.id, p.name]));
    const productionByProfessional = professionalIds
      .map((id) => ({ professionalUserId: id, name: professionalNameById.get(id) ?? "—", total: productionMap.get(id)! }))
      .sort((a, b) => b.total - a.total);

    // Inadimplência: parcelas vencidas e ainda não pagas (independe do período selecionado)
    const overdueInstallments = await tx.receivableInstallment.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["pending"] },
        dueDate: { lt: new Date() },
      },
      include: { receivable: { include: { patient: { select: { id: true, name: true } } } } },
      orderBy: { dueDate: "asc" },
    });
    const totalOverdue = overdueInstallments.reduce((sum, i) => sum + Number(i.amount), 0);

    return {
      totalRevenue,
      revenueByDay,
      productionByProfessional,
      overdue: overdueInstallments.map((i) => ({
        id: i.id,
        patientId: i.receivable.patient.id,
        patientName: i.receivable.patient.name,
        amount: Number(i.amount),
        dueDate: i.dueDate,
      })),
      totalOverdue,
      paidCount: paidInstallments.length,
    };
  });

  return NextResponse.json(result);
}

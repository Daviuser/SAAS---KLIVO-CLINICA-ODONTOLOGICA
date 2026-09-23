import { getServerSession } from "next-auth";
import Link from "next/link";
import { CalendarClock, Wallet, Users, TrendingDown, Bell } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const firstName = user?.name?.split(" ")[0];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  const { recentPatients, upcomingAppointments, kpis } = await withTenantContext(
    user.organizationId,
    async (tx) => {
      const [
        recentPatients,
        upcomingAppointments,
        appointmentsToday,
        newPatientsThisMonth,
        paidThisMonth,
        paidToday,
        commissionsToday,
      ] = await Promise.all([
        tx.patient.findMany({
          where: { organizationId: user.organizationId, active: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, name: true, phone: true, whatsapp: true },
        }),
        tx.appointment.findMany({
          where: {
            organizationId: user.organizationId,
            startsAt: { gte: now, lte: dayEnd },
            status: { notIn: ["cancelada", "faltou"] },
          },
          orderBy: { startsAt: "asc" },
          take: 5,
          include: { patient: { select: { name: true } } },
        }),
        tx.appointment.count({
          where: { organizationId: user.organizationId, startsAt: { gte: dayStart, lte: dayEnd } },
        }),
        tx.patient.count({
          where: { organizationId: user.organizationId, createdAt: { gte: monthStart } },
        }),
        tx.receivableInstallment.findMany({
          where: { organizationId: user.organizationId, status: "paid", paidAt: { gte: monthStart } },
          select: { amount: true },
        }),
        tx.receivableInstallment.findMany({
          where: { organizationId: user.organizationId, status: "paid", paidAt: { gte: dayStart, lte: dayEnd } },
          select: { amount: true },
        }),
        tx.commissionEntry.findMany({
          where: { organizationId: user.organizationId, createdAt: { gte: dayStart, lte: dayEnd } },
          select: { amount: true },
        }),
      ]);

      const todayRevenue = paidToday.reduce((sum, i) => sum + Number(i.amount), 0);
      const todayCommissions = commissionsToday.reduce((sum, c) => sum + Number(c.amount), 0);

      return {
        recentPatients,
        upcomingAppointments,
        kpis: {
          appointmentsToday,
          newPatientsThisMonth,
          revenueThisMonth: paidThisMonth.reduce((sum, i) => sum + Number(i.amount), 0),
          todayRevenue,
          todayCommissions,
          todayNet: todayRevenue - todayCommissions,
        },
      };
    }
  );

  const metrics = [
    { label: "Consultas hoje", value: String(kpis.appointmentsToday), icon: CalendarClock },
    { label: "Entrou hoje", value: formatCurrency(kpis.todayRevenue), icon: Wallet },
    { label: "Faturamento do mês", value: formatCurrency(kpis.revenueThisMonth), icon: Wallet },
    { label: "Novos pacientes no mês", value: String(kpis.newPatientsThisMonth), icon: Users },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-display text-2xl text-ink">Olá, {firstName}</h1>
      <p className="text-sm text-ink-muted mt-1">
        Você está logado como <span className="text-ink font-medium">{user?.roleName}</span>
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-white border border-border rounded p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">{metric.label}</p>
                <Icon size={16} className="text-primary/60" strokeWidth={1.75} />
              </div>
              <p className="font-display text-3xl text-ink mt-2">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">Comissões hoje</p>
            <TrendingDown size={16} className="text-alert/60" strokeWidth={1.75} />
          </div>
          <p className="font-display text-2xl text-alert mt-2">{formatCurrency(kpis.todayCommissions)}</p>
        </div>
        <div className="bg-white border border-border rounded p-5">
          <p className="text-sm text-ink-muted">Líquido hoje</p>
          <p className="font-display text-2xl text-primary-dark mt-2">{formatCurrency(kpis.todayNet)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-border rounded">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">Pacientes recentes</h2>
            <Link href="/patients" className="text-xs text-primary hover:text-primary-dark">
              Ver todos
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">Nenhum paciente cadastrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentPatients.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <Link href={`/patients/${p.id}`} className="text-ink hover:text-primary font-medium">
                    {p.name}
                  </Link>
                  <span className="text-ink-muted text-xs">{p.phone ?? p.whatsapp ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-border rounded">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-ink-muted" strokeWidth={1.75} />
              <h2 className="text-sm font-medium text-ink">Próximos atendimentos</h2>
            </div>
            <Link href="/agenda" className="text-xs text-primary hover:text-primary-dark">
              Ver agenda
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-muted">Nenhum atendimento restante hoje.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcomingAppointments.map((appt) => (
                <li key={appt.id} className="px-5 py-3 text-sm">
                  <p className="text-ink font-medium">{appt.patient.name}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(appt.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

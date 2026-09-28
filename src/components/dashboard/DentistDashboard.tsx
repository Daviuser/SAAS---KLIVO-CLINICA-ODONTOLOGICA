import Link from "next/link";
import {
  CalendarClock,
  Hourglass,
  CheckCircle2,
  UserRound,
  TrendingUp,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { withTenantContext } from "@/lib/tenant-context";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  em_atendimento: "Em atendimento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  faltou: "Faltou",
};

const STATUS_COLORS: Record<string, string> = {
  agendada: "bg-ink-muted/10 text-ink-muted border-ink-muted/20",
  confirmada: "bg-primary/10 text-primary border-primary/25",
  em_atendimento: "bg-primary-light/20 text-primary-dark border-primary-light/40",
  concluida: "bg-primary-light/15 text-primary-dark border-primary-light/30",
  cancelada: "bg-alert/10 text-alert border-alert/25",
  faltou: "bg-alert/10 text-alert border-alert/25",
};

// Dashboard do Dentista — tudo aqui é filtrado pelo PRÓPRIO profissional
// (professionalUserId = user.id nas queries), tanto a agenda quanto a
// produção e a comissão. Nunca inclui dados de outro profissional nem
// o financeiro geral da clínica — isso é intencional, não um recorte de
// UI: quem não tem permissão de financeiro/comissões de terceiros nunca
// vê esses dados, ponto (ver matriz de permissões).
//
// "Produção" e "comissão" do período seguem a mesma definição já usada
// em /reports e /commissions no restante do sistema: valor de parcelas
// EFETIVAMENTE PAGAS (a clínica trabalha em regime de caixa — recebe no
// ato do atendimento, sem contas a receber pendentes no fluxo padrão),
// nunca o valor apenas orçado/planejado.
export async function DentistDashboard({ user }: { user: any }) {
  const firstName = user?.name?.split(" ")[0];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  const data = await withTenantContext(user.organizationId, async (tx) => {
    const [
      appointmentsToday,
      waitingCount,
      completedTodayCount,
      nextAppointment,
      todayAgenda,
      paidThisMonth,
      commissionsThisMonth,
    ] = await Promise.all([
      tx.appointment.count({
        where: {
          organizationId: user.organizationId,
          professionalUserId: user.id,
          startsAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      tx.appointment.count({
        where: {
          organizationId: user.organizationId,
          professionalUserId: user.id,
          startsAt: { gte: dayStart, lte: now },
          status: { in: ["agendada", "confirmada"] },
        },
      }),
      tx.appointment.count({
        where: {
          organizationId: user.organizationId,
          professionalUserId: user.id,
          startsAt: { gte: dayStart, lte: dayEnd },
          status: "concluida",
        },
      }),
      tx.appointment.findFirst({
        where: {
          organizationId: user.organizationId,
          professionalUserId: user.id,
          startsAt: { gte: now, lte: dayEnd },
          status: { notIn: ["cancelada", "faltou", "concluida"] },
        },
        orderBy: { startsAt: "asc" },
        include: { patient: { select: { id: true, name: true } }, procedure: { select: { name: true } } },
      }),
      tx.appointment.findMany({
        where: {
          organizationId: user.organizationId,
          professionalUserId: user.id,
          startsAt: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { startsAt: "asc" },
        take: 12,
        include: { patient: { select: { id: true, name: true } }, procedure: { select: { name: true } } },
      }),
      tx.receivableInstallment.findMany({
        where: { organizationId: user.organizationId, status: "paid", paidAt: { gte: monthStart } },
        select: {
          amount: true,
          receivable: {
            select: {
              budget: { select: { professionalUserId: true } },
              appointment: { select: { professionalUserId: true } },
            },
          },
        },
      }),
      tx.commissionEntry.findMany({
        where: { organizationId: user.organizationId, professionalUserId: user.id, createdAt: { gte: monthStart } },
        select: { amount: true },
      }),
    ]);

    const ownProductionThisMonth = paidThisMonth.reduce((sum, inst) => {
      const profId = inst.receivable.budget?.professionalUserId ?? inst.receivable.appointment?.professionalUserId;
      return profId === user.id ? sum + Number(inst.amount) : sum;
    }, 0);

    const ownCommissionThisMonth = commissionsThisMonth.reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      appointmentsToday,
      waitingCount,
      completedTodayCount,
      nextAppointment,
      todayAgenda,
      ownProductionThisMonth,
      ownCommissionThisMonth,
    };
  });

  const metrics: { label: string; value: string; sub?: string; icon: typeof CalendarClock }[] = [
    { label: "Consultas hoje", value: String(data.appointmentsToday), icon: CalendarClock },
    { label: "Aguardando atendimento", value: String(data.waitingCount), icon: Hourglass },
    { label: "Concluídas hoje", value: String(data.completedTodayCount), icon: CheckCircle2 },
    {
      label: "Próximo paciente",
      value: data.nextAppointment ? data.nextAppointment.patient.name : "—",
      sub: data.nextAppointment
        ? `${formatTime(data.nextAppointment.startsAt)}${data.nextAppointment.procedure ? ` · ${data.nextAppointment.procedure.name}` : ""}`
        : "Nenhum atendimento restante hoje",
      icon: UserRound,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
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
              <p className="font-display text-2xl text-ink mt-2 truncate">{metric.value}</p>
              {metric.sub && (
                <p className="text-xs text-ink-muted mt-0.5">{metric.sub}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">Minha produção no período</p>
            <TrendingUp size={16} className="text-primary/60" strokeWidth={1.75} />
          </div>
          <p className="font-display text-2xl text-ink mt-2">{formatCurrency(data.ownProductionThisMonth)}</p>
          <p className="text-xs text-ink-muted mt-0.5">Mês atual · valor já recebido</p>
        </div>
        <div className="bg-white border border-border rounded p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">Minha comissão no período</p>
            <Wallet size={16} className="text-primary/60" strokeWidth={1.75} />
          </div>
          <p className="font-display text-2xl text-primary-dark mt-2">{formatCurrency(data.ownCommissionThisMonth)}</p>
          <p className="text-xs text-ink-muted mt-0.5">Mês atual</p>
          <Link href="/commissions" className="text-xs text-primary hover:text-primary-dark mt-2 inline-flex items-center gap-1">
            Ver extrato completo <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="mt-6 bg-white border border-border rounded">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Meus atendimentos de hoje</h2>
          <Link href="/agenda" className="text-xs text-primary hover:text-primary-dark">
            Ver minha agenda
          </Link>
        </div>
        {data.todayAgenda.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">Nenhum atendimento agendado para hoje.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.todayAgenda.map((appt) => (
              <li key={appt.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-ink font-medium truncate">{appt.patient.name}</p>
                  <p className="text-xs text-ink-muted">
                    {formatTime(appt.startsAt)}
                    {appt.procedure ? ` · ${appt.procedure.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[appt.status] ?? ""}`}>
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </span>
                  <Link
                    href={`/patients/${appt.patient.id}/prontuario`}
                    className="text-xs text-primary hover:text-primary-dark whitespace-nowrap"
                  >
                    Abrir prontuário
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

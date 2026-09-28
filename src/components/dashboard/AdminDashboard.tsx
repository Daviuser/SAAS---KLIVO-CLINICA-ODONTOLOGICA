import Link from "next/link";
import {
  Users,
  CalendarClock,
  Wallet,
  CreditCard,
  UserPlus,
  Percent,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Receipt,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { withTenantContext } from "@/lib/tenant-context";
import { FadeIn, MiniBarSparkline, Sparkline } from "@/components/dashboard/Animated";
import { RevenueChart } from "@/components/dashboard/RevenueChart";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function endOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function monthLabel(d: Date) {
  const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Delta em porcentagem entre dois valores. Quando não há base de
// comparação (mês/dia anterior igual a zero), evita divisão por zero.
function pctDelta(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function DeltaBadge({ value, mode = "percent" }: { value: number; mode?: "percent" | "count" }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const color = isUp ? "text-primary" : isDown ? "text-alert" : "text-ink-muted";
  const text = mode === "percent" ? `${value > 0 ? "+" : ""}${value}%` : `${value > 0 ? "+" : ""}${value}`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon size={12} strokeWidth={2.25} />
      {text}
    </span>
  );
}

// Dashboard "geral" da clínica — visão administrativa completa, com
// faturamento, comissões, gráfico de receita e pacientes recentes da
// organização inteira. Continua sendo o dashboard exibido para
// Administrador, Gestor, Financeiro e qualquer papel customizado que a
// clínica venha a criar — Dentista e Recepção têm os próprios
// dashboards (ver DentistDashboard.tsx / ReceptionDashboard.tsx),
// decidido em dashboard/page.tsx pela sessão autenticada.
export async function AdminDashboard({ user }: { user: any }) {
  const firstName = user?.name?.split(" ")[0];
  const organizationId = user.organizationId;

  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = startOfDay(yesterday);
  const yesterdayEnd = endOfDay(yesterday);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Janela de 6 meses (mês atual + 5 anteriores), usada tanto pelo
  // gráfico principal quanto pelos comparativos mês-a-mês — assim
  // evitamos rodar consultas repetidas para o mesmo intervalo de dados.
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const commissionsFetchFrom = monthStart < yesterdayStart ? monthStart : yesterdayStart;

  const {
    recentPatients,
    upcomingAppointments,
    patientsToday,
    patientsYesterday,
    appointmentsToday,
    appointmentsYesterday,
    todayRevenue,
    yesterdayRevenue,
    revenueThisMonth,
    revenueLastMonth,
    revenueSeries,
    newPatientsThisMonth,
    newPatientsLastMonth,
    newPatientsSeries,
    todayCommissions,
    yesterdayCommissions,
    commissionsThisMonth,
    expensesThisMonth,
  } = await withTenantContext(organizationId, async (tx) => {
    const [
      recentPatients,
      upcomingAppointments,
      recentAppointments,
      paidLast6Months,
      patientsLast6Months,
      commissionsRecent,
      payablesThisMonth,
    ] = await Promise.all([
      tx.patient.findMany({
        where: { organizationId, active: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, phone: true, whatsapp: true },
      }),
      tx.appointment.findMany({
        where: {
          organizationId,
          startsAt: { gte: now, lte: dayEnd },
          status: { notIn: ["cancelada", "faltou"] },
        },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { patient: { select: { name: true } } },
      }),
      // Consultas de ontem + hoje, para calcular "consultas hoje" e
      // "pacientes hoje" (pacientes distintos atendidos) junto com seus
      // comparativos, numa única consulta.
      tx.appointment.findMany({
        where: {
          organizationId,
          startsAt: { gte: yesterdayStart, lte: dayEnd },
          status: { notIn: ["cancelada", "faltou"] },
        },
        select: { patientId: true, startsAt: true },
      }),
      // Recebimentos pagos nos últimos 6 meses — usados no gráfico e nos
      // comparativos de faturamento (hoje/ontem/mês/mês anterior).
      tx.receivableInstallment.findMany({
        where: { organizationId, status: "paid", paidAt: { gte: sixMonthsAgoStart } },
        select: { amount: true, paidAt: true },
      }),
      // Pacientes cadastrados nos últimos 6 meses — usados no comparativo
      // de novos pacientes e na mini evolução do card.
      tx.patient.findMany({
        where: { organizationId, createdAt: { gte: sixMonthsAgoStart } },
        select: { createdAt: true },
      }),
      tx.commissionEntry.findMany({
        where: { organizationId, createdAt: { gte: commissionsFetchFrom } },
        select: { amount: true, createdAt: true },
      }),
      tx.payable.findMany({
        where: { organizationId, status: "paid", paidAt: { gte: monthStart } },
        select: { amount: true },
      }),
    ]);

    // --- Consultas / pacientes atendidos hoje x ontem ---
    let appointmentsToday = 0;
    let appointmentsYesterday = 0;
    const patientsTodaySet = new Set<string>();
    const patientsYesterdaySet = new Set<string>();
    for (const a of recentAppointments) {
      if (a.startsAt >= dayStart && a.startsAt <= dayEnd) {
        appointmentsToday++;
        patientsTodaySet.add(a.patientId);
      } else if (a.startsAt >= yesterdayStart && a.startsAt <= yesterdayEnd) {
        appointmentsYesterday++;
        patientsYesterdaySet.add(a.patientId);
      }
    }

    // --- Faturamento: hoje / ontem / mês / mês anterior / série de 6 meses ---
    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    const revenueByMonth = new Map<string, number>();
    for (const inst of paidLast6Months) {
      const amount = Number(inst.amount);
      const paidAt = inst.paidAt as Date;
      const key = monthKey(paidAt);
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
      if (paidAt >= dayStart && paidAt <= dayEnd) todayRevenue += amount;
      else if (paidAt >= yesterdayStart && paidAt <= yesterdayEnd) yesterdayRevenue += amount;
    }
    const revenueThisMonth = revenueByMonth.get(monthKey(monthStart)) ?? 0;
    const revenueLastMonth = revenueByMonth.get(monthKey(lastMonthStart)) ?? 0;
    const revenueSeries = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: monthLabel(d), value: revenueByMonth.get(monthKey(d)) ?? 0, isCurrent: i === 5 };
    });

    // --- Novos pacientes: mês / mês anterior / série de 6 meses ---
    const patientsByMonth = new Map<string, number>();
    for (const p of patientsLast6Months) {
      const key = monthKey(p.createdAt as Date);
      patientsByMonth.set(key, (patientsByMonth.get(key) ?? 0) + 1);
    }
    const newPatientsThisMonth = patientsByMonth.get(monthKey(monthStart)) ?? 0;
    const newPatientsLastMonth = patientsByMonth.get(monthKey(lastMonthStart)) ?? 0;
    const newPatientsSeries = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return patientsByMonth.get(monthKey(d)) ?? 0;
    });

    // --- Comissões: hoje / ontem / mês ---
    let todayCommissions = 0;
    let yesterdayCommissions = 0;
    let commissionsThisMonth = 0;
    for (const c of commissionsRecent) {
      const amount = Number(c.amount);
      const createdAt = c.createdAt as Date;
      if (createdAt >= monthStart) commissionsThisMonth += amount;
      if (createdAt >= dayStart && createdAt <= dayEnd) todayCommissions += amount;
      else if (createdAt >= yesterdayStart && createdAt <= yesterdayEnd) yesterdayCommissions += amount;
    }

    const expensesThisMonth = payablesThisMonth.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      recentPatients,
      upcomingAppointments,
      patientsToday: patientsTodaySet.size,
      patientsYesterday: patientsYesterdaySet.size,
      appointmentsToday,
      appointmentsYesterday,
      todayRevenue,
      yesterdayRevenue,
      revenueThisMonth,
      revenueLastMonth,
      revenueSeries,
      newPatientsThisMonth,
      newPatientsLastMonth,
      newPatientsSeries,
      todayCommissions,
      yesterdayCommissions,
      commissionsThisMonth,
      expensesThisMonth,
    };
  });

  const netThisMonth = revenueThisMonth - commissionsThisMonth - expensesThisMonth;

  const cards = [
    {
      key: "patients",
      label: "Pacientes hoje",
      value: String(patientsToday),
      delta: <DeltaBadge value={patientsToday - patientsYesterday} mode="count" />,
      deltaCaption: "em relação a ontem",
      icon: Users,
      theme: "bg-[#EAF7F0] border-[#D3EEDF]",
      iconTheme: "bg-[#D3EEDF] text-[#0E6B5C]",
    },
    {
      key: "appointments",
      label: "Consultas hoje",
      value: String(appointmentsToday),
      delta: <DeltaBadge value={appointmentsToday - appointmentsYesterday} mode="count" />,
      deltaCaption: "em relação a ontem",
      icon: CalendarClock,
      theme: "bg-[#EAF2FB] border-[#D6E7F8]",
      iconTheme: "bg-[#D6E7F8] text-[#2B6CB0]",
    },
    {
      key: "revenueToday",
      label: "Entrou hoje",
      value: formatCurrency(todayRevenue),
      delta: <DeltaBadge value={pctDelta(todayRevenue, yesterdayRevenue)} />,
      deltaCaption: "em relação a ontem",
      icon: Wallet,
      theme: "bg-[#EAF7F0] border-[#D3EEDF]",
      iconTheme: "bg-[#D3EEDF] text-[#0E6B5C]",
    },
    {
      key: "revenueMonth",
      label: "Faturamento do mês",
      value: formatCurrency(revenueThisMonth),
      delta: <DeltaBadge value={pctDelta(revenueThisMonth, revenueLastMonth)} />,
      deltaCaption: "em relação ao mês anterior",
      icon: CreditCard,
      theme: "bg-[#EAF2FB] border-[#D6E7F8]",
      iconTheme: "bg-[#D6E7F8] text-[#2B6CB0]",
      extra: (
        <MiniBarSparkline
          values={revenueSeries.map((m) => m.value)}
          className="text-[#2B6CB0]/60 mt-3"
        />
      ),
    },
    {
      key: "newPatients",
      label: "Novos pacientes no mês",
      value: String(newPatientsThisMonth),
      delta: <DeltaBadge value={newPatientsThisMonth - newPatientsLastMonth} mode="count" />,
      deltaCaption: "em relação ao mês anterior",
      icon: UserPlus,
      theme: "bg-[#F3EEFB] border-[#E6DAF7]",
      iconTheme: "bg-[#E6DAF7] text-[#7C5CBF]",
      extra: <Sparkline values={newPatientsSeries} className="text-[#7C5CBF]/70 mt-3 w-full" />,
    },
    {
      key: "commissions",
      label: "Comissões hoje",
      value: formatCurrency(todayCommissions),
      delta: <DeltaBadge value={pctDelta(todayCommissions, yesterdayCommissions)} />,
      deltaCaption: "em relação a ontem",
      icon: Percent,
      theme: "bg-[#FDF1E7] border-[#FBE3CC]",
      iconTheme: "bg-[#FBE3CC] text-[#C1701C]",
    },
  ];

  const summaryRows = [
    {
      label: "Faturamento do mês",
      value: formatCurrency(revenueThisMonth),
      icon: Wallet,
      color: "text-primary",
      iconBg: "bg-primary/10",
      href: "/financial",
    },
    {
      label: "Comissões",
      value: formatCurrency(commissionsThisMonth),
      icon: Percent,
      color: "text-[#C1701C]",
      iconBg: "bg-[#FBE3CC]",
      href: null, // ainda não existe uma página dedicada de comissões
    },
    {
      label: "Despesas",
      value: formatCurrency(expensesThisMonth),
      icon: Receipt,
      color: "text-alert",
      iconBg: "bg-alert/10",
      href: "/financial?tab=payables",
    },
    {
      label: "Saldo líquido",
      value: formatCurrency(netThisMonth),
      icon: TrendingUp,
      color: "text-primary-dark",
      iconBg: "bg-primary-light/15",
      href: null, // indicador calculado, sem página própria
    },
  ];

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-display text-2xl text-ink">Olá, {firstName}</h1>
      <p className="text-sm text-ink-muted mt-1">
        Você está logado como <span className="text-ink font-medium">{user?.roleName}</span>
      </p>

      {/* Cards de indicadores */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <FadeIn key={card.key} delayMs={i * 60}>
              <div className={`border rounded-2xl p-5 h-full ${card.theme}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-4 ${card.iconTheme}`}>
                  <Icon size={17} strokeWidth={1.9} />
                </div>
                <p className="text-sm text-ink-muted">{card.label}</p>
                <p className="font-display text-2xl sm:text-[26px] text-ink mt-1.5 leading-tight">{card.value}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {card.delta}
                  <span className="text-[11px] text-ink-muted">{card.deltaCaption}</span>
                </div>
                {card.extra}
              </div>
            </FadeIn>
          );
        })}
      </div>

      {/* Gráfico + Resumo financeiro */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FadeIn delayMs={360} className="lg:col-span-2">
          <div className="bg-white border border-border rounded-2xl p-6 h-full">
            <RevenueChart months={revenueSeries} />
          </div>
        </FadeIn>

        <FadeIn delayMs={420}>
          <div className="bg-white border border-border rounded-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-ink">Resumo financeiro</h2>
            </div>
            <div className="divide-y divide-border">
              {summaryRows.map((row) => {
                const Icon = row.icon;
                const content = (
                  <>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${row.iconBg}`}>
                      <Icon size={16} className={row.color} strokeWidth={1.9} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-muted">{row.label}</p>
                      <p className={`text-sm font-semibold ${row.color}`}>{row.value}</p>
                    </div>
                    {row.href && <ChevronRight size={16} className="text-ink-muted/50 shrink-0" />}
                  </>
                );
                return row.href ? (
                  <Link
                    key={row.label}
                    href={row.href}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={row.label} className="flex items-center gap-3 px-5 py-3.5">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Pacientes recentes + próximos atendimentos (mantidos do dashboard anterior) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FadeIn delayMs={480} className="lg:col-span-2">
          <div className="bg-white border border-border rounded-2xl h-full">
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
        </FadeIn>

        <FadeIn delayMs={540}>
          <div className="bg-white border border-border rounded-2xl h-full">
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
        </FadeIn>
      </div>
    </div>
  );
}

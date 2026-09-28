import Link from "next/link";
import {
  CalendarClock,
  Hourglass,
  CalendarCheck2,
  Clock3,
  CalendarX2,
  Plus,
} from "lucide-react";
import { withTenantContext } from "@/lib/tenant-context";

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

// Dashboard da Recepção — foco 100% operacional (agenda da clínica
// inteira, confirmações, fila do dia). De propósito, NENHUMA query aqui
// toca em receivableInstallment, commissionEntry ou qualquer coisa
// financeira: a recepção não tem FINANCIAL_READ/COMMISSIONS_READ por
// padrão, e mesmo que tivesse, este dashboard específico não expõe
// esse tipo de dado — a tela certa pra isso é /financial, protegida
// pela permissão correspondente.
export async function ReceptionDashboard({ user }: { user: any }) {
  const firstName = user?.name?.split(" ")[0];

  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  const data = await withTenantContext(user.organizationId, async (tx) => {
    const [
      appointmentsToday,
      waitingCount,
      confirmedTodayCount,
      pendingConfirmationCount,
      cancelledOrNoShowTodayCount,
      upcoming,
    ] = await Promise.all([
      tx.appointment.count({
        where: { organizationId: user.organizationId, startsAt: { gte: dayStart, lte: dayEnd } },
      }),
      tx.appointment.count({
        where: {
          organizationId: user.organizationId,
          startsAt: { gte: dayStart, lte: now },
          status: { in: ["agendada", "confirmada"] },
        },
      }),
      tx.appointment.count({
        where: { organizationId: user.organizationId, startsAt: { gte: dayStart, lte: dayEnd }, status: "confirmada" },
      }),
      tx.appointment.count({
        where: { organizationId: user.organizationId, startsAt: { gte: dayStart, lte: dayEnd }, status: "agendada" },
      }),
      tx.appointment.count({
        where: {
          organizationId: user.organizationId,
          startsAt: { gte: dayStart, lte: dayEnd },
          status: { in: ["cancelada", "faltou"] },
        },
      }),
      tx.appointment.findMany({
        where: {
          organizationId: user.organizationId,
          startsAt: { gte: now, lte: dayEnd },
          status: { notIn: ["cancelada", "faltou"] },
        },
        orderBy: { startsAt: "asc" },
        take: 10,
        include: { patient: { select: { id: true, name: true } } },
      }),
    ]);

    // Nome do profissional de cada consulta — carregado à parte (mesmo
    // padrão usado em /api/reports/summary) pra não precisar de include
    // aninhado desnecessário.
    const professionalIds = Array.from(new Set(upcoming.map((a) => a.professionalUserId)));
    const professionals = professionalIds.length
      ? await tx.user.findMany({ where: { id: { in: professionalIds } }, select: { id: true, name: true } })
      : [];
    const professionalNameById = new Map(professionals.map((p) => [p.id, p.name]));

    return {
      appointmentsToday,
      waitingCount,
      confirmedTodayCount,
      pendingConfirmationCount,
      cancelledOrNoShowTodayCount,
      upcoming: upcoming.map((a) => ({
        ...a,
        professionalName: professionalNameById.get(a.professionalUserId) ?? "—",
      })),
    };
  });

  const metrics = [
    { label: "Consultas hoje", value: String(data.appointmentsToday), icon: CalendarClock },
    { label: "Aguardando atendimento", value: String(data.waitingCount), icon: Hourglass },
    { label: "Confirmadas", value: String(data.confirmedTodayCount), icon: CalendarCheck2 },
    { label: "Pendentes de confirmação", value: String(data.pendingConfirmationCount), icon: Clock3 },
    { label: "Cancelamentos e faltas hoje", value: String(data.cancelledOrNoShowTodayCount), icon: CalendarX2 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Olá, {firstName}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Você está logado como <span className="text-ink font-medium">{user?.roleName}</span>
          </p>
        </div>
        <Link
          href="/agenda"
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Novo agendamento
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

      <div className="mt-6 bg-white border border-border rounded">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Próximos horários — todos os dentistas</h2>
          <Link href="/agenda" className="text-xs text-primary hover:text-primary-dark">
            Ver agenda da clínica
          </Link>
        </div>
        {data.upcoming.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">Nenhum atendimento restante hoje.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.upcoming.map((appt) => (
              <li key={appt.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-ink font-medium truncate">{appt.patient.name}</p>
                  <p className="text-xs text-ink-muted">
                    {formatTime(appt.startsAt)} · {appt.professionalName}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${STATUS_COLORS[appt.status] ?? ""}`}>
                  {STATUS_LABELS[appt.status] ?? appt.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/patients" className="bg-white border border-border rounded p-5 hover:border-primary/40 transition-colors">
          <p className="text-sm font-medium text-ink">Pacientes</p>
          <p className="text-xs text-ink-muted mt-1">Cadastrar, buscar e atualizar dados de contato</p>
        </Link>
        <Link href="/agenda" className="bg-white border border-border rounded p-5 hover:border-primary/40 transition-colors">
          <p className="text-sm font-medium text-ink">Agenda da clínica</p>
          <p className="text-xs text-ink-muted mt-1">Agendar, remarcar, cancelar e confirmar presença</p>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  User as UserIcon,
  CalendarX,
} from "lucide-react";
import { DurationPicker } from "@/components/ui/DurationPicker";

type Appointment = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  patient: { id: string; name: string; phone?: string | null; whatsapp?: string | null };
  resource: { id: string; name: string } | null;
  procedure: { id: string; name: string } | null;
  professionalUserId: string;
};

type Patient = { id: string; name: string };
type Professional = { id: string; name: string };
type Resource = { id: string; name: string };
type Procedure = { id: string; name: string };

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

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Formata como YYYY-MM-DD usando o horário LOCAL (evita o bug clássico de
// toISOString(), que converte para UTC e pode "pular" o dia perto da
// meia-noite em fusos negativos como o do Brasil).
function formatDateISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // 0 = domingo
  d.setHours(0, 0, 0, 0);
  return d;
}

// Monta a grade completa do mês (sempre em semanas cheias, de domingo a
// sábado), incluindo os dias do mês anterior/seguinte necessários para
// preencher a primeira e a última semana.
function buildMonthGrid(monthDate: Date) {
  const first = startOfMonth(monthDate);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days: Date[] = [];
  const cursor = startOfWeek(first);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    days.push(new Date(cursor));
    const pastLast = cursor.getTime() >= last.getTime();
    const isSaturday = cursor.getDay() === 6;
    cursor.setDate(cursor.getDate() + 1);
    if (pastLast && isSaturday) break;
  }
  return days;
}

export default function AgendaPage() {
  const today = new Date();
  const todayKey = formatDateISO(today);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const days = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  const weeks = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [days]);

  useEffect(() => {
    fetch("/api/professionals").then((r) => r.ok && r.json()).then((d) => d && setProfessionals(d.professionals));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  async function load() {
    setLoading(true);
    const from = days[0];
    const to = new Date(days[days.length - 1]);
    to.setHours(23, 59, 59, 999);

    const res = await fetch(`/api/appointments?from=${from.toISOString()}&to=${to.toISOString()}`);
    if (res.ok) setAppointments((await res.json()).appointments);
    setLoading(false);
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.appointment?.generatedReceivable) {
        setToast("Consulta concluída — conta a receber gerada automaticamente no financeiro.");
        setTimeout(() => setToast(null), 5000);
      }
      setSelectedAppt((prev) => (prev ? { ...prev, status } : prev));
    } else {
      const data = await res.json().catch(() => ({}));
      setToast(`Erro ao atualizar status: ${data.error ?? `status ${res.status}`}`);
      setTimeout(() => setToast(null), 6000);
    }
    load();
  }

  function shiftMonth(delta: number) {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function goToday() {
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  }

  function selectDay(day: Date) {
    if (day.getMonth() !== currentMonth.getMonth() || day.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(startOfMonth(day));
    }
    setSelectedDate(day);
  }

  const filteredAppointments = useMemo(
    () =>
      professionalFilter === "all"
        ? appointments
        : appointments.filter((a) => a.professionalUserId === professionalFilter),
    [appointments, professionalFilter]
  );

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of filteredAppointments) {
      const key = formatDateISO(new Date(a.startsAt));
      (map[key] ??= []).push(a);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return map;
  }, [filteredAppointments]);

  const selectedKey = formatDateISO(selectedDate);
  const selectedDateAppointments = appointmentsByDate[selectedKey] ?? [];
  const monthLabel = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const isViewingCurrentMonth =
    currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl text-ink">Agenda</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Novo agendamento
        </button>
      </div>

      {toast && (
        <div
          className={`mb-4 text-sm rounded px-4 py-2.5 border ${
            toast.startsWith("Erro")
              ? "text-alert bg-alert/5 border-alert/20"
              : "text-primary-dark bg-primary-light/10 border-primary-light/30"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={professionalFilter}
          onChange={(e) => setProfessionalFilter(e.target.value)}
          className="text-sm border border-border rounded px-3 py-1.5 bg-white"
        >
          <option value="all">Todos os profissionais</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6">
        {/* Calendário mensal */}
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
              className="p-1.5 rounded hover:bg-surface text-ink-muted hover:text-ink"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink capitalize">{monthLabel}</p>
              {!isViewingCurrentMonth && (
                <button onClick={goToday} className="text-xs text-primary hover:text-primary-dark">
                  Hoje
                </button>
              )}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
              className="p-1.5 rounded hover:bg-surface text-ink-muted hover:text-ink"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-ink-muted uppercase pt-3 pb-1 px-1.5 sm:px-2">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 p-1.5 sm:p-2">
            {weeks.flat().map((day) => {
              const dayKey = formatDateISO(day);
              const inMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = dayKey === todayKey;
              const isSelected = dayKey === selectedKey;
              const hasAppts = (appointmentsByDate[dayKey]?.length ?? 0) > 0;

              return (
                <button
                  key={dayKey}
                  onClick={() => selectDay(day)}
                  className={`aspect-square sm:aspect-auto sm:h-16 lg:h-20 flex flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
                    isSelected
                      ? "bg-primary text-white font-semibold"
                      : isToday
                      ? "border border-primary text-primary font-medium hover:bg-primary/5"
                      : inMonth
                      ? "text-ink hover:bg-surface"
                      : "text-ink-muted/30 hover:bg-surface"
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {hasAppts && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agendamentos do dia selecionado */}
        <div className="bg-white border border-border rounded-lg p-4 h-fit lg:sticky lg:top-6">
          <p className="text-sm font-semibold text-ink capitalize">
            {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <p className="text-xs text-primary mb-4 h-4">{selectedKey === todayKey ? "Hoje" : ""}</p>

          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 border border-dashed border-primary/40 text-primary hover:bg-primary/5 text-sm font-medium rounded py-2 mb-4 transition-colors"
          >
            <Plus size={14} />
            Novo agendamento
          </button>

          {loading && <p className="text-sm text-ink-muted text-center py-6">Carregando...</p>}

          {!loading && selectedDateAppointments.length === 0 && (
            <div className="text-center py-8">
              <CalendarX size={26} className="mx-auto text-ink-muted/30 mb-2" />
              <p className="text-sm text-ink-muted">Nenhum agendamento neste dia.</p>
            </div>
          )}

          {!loading && selectedDateAppointments.length > 0 && (
            <div className="space-y-2">
              {selectedDateAppointments.map((appt) => (
                <button
                  key={appt.id}
                  onClick={() => setSelectedAppt(appt)}
                  className={`w-full text-left rounded border px-3 py-2 hover:shadow-sm transition-shadow ${STATUS_COLORS[appt.status]}`}
                >
                  <p className="text-xs font-semibold leading-tight">
                    {new Date(appt.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {appt.patient.name}
                  </p>
                  <p className="text-[11px] opacity-80 truncate leading-tight mt-0.5">
                    {appt.procedure?.name ?? "Sem procedimento"}
                    {appt.resource ? ` · ${appt.resource.name}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <NewAppointmentForm
          date={selectedDate}
          defaultProfessionalId={professionalFilter !== "all" ? professionalFilter : ""}
          existingAppointments={appointments}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {selectedAppt && (
        <AppointmentDetail
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onChangeStatus={changeStatus}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Detalhe rápido de uma consulta — visualizar e trocar status
// ------------------------------------------------------------
function AppointmentDetail({
  appt,
  onClose,
  onChangeStatus,
}: {
  appt: Appointment;
  onClose: () => void;
  onChangeStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-border shadow-lg w-full max-w-sm p-5 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-ink">{appt.patient.name}</p>
            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
              <Clock size={12} />
              {new Date(appt.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              {" · "}{appt.durationMinutes} min
            </p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5 text-sm text-ink-muted mb-4">
          <p>
            <span className="text-ink-muted/70">Procedimento: </span>
            <span className="text-ink">{appt.procedure?.name ?? "Não definido"}</span>
          </p>
          {appt.resource && (
            <p>
              <span className="text-ink-muted/70">Sala/cadeira: </span>
              <span className="text-ink">{appt.resource.name}</span>
            </p>
          )}
          {(appt.patient.phone || appt.patient.whatsapp) && (
            <p>
              <span className="text-ink-muted/70">Contato: </span>
              <span className="text-ink">{appt.patient.phone ?? appt.patient.whatsapp}</span>
            </p>
          )}
          {appt.notes && (
            <p>
              <span className="text-ink-muted/70">Observações: </span>
              <span className="text-ink">{appt.notes}</span>
            </p>
          )}
        </div>

        <label className="block text-xs text-ink-muted mb-1">Status</label>
        <select
          value={appt.status}
          onChange={(e) => onChangeStatus(appt.id, e.target.value)}
          className="w-full border border-border rounded px-3 py-2 text-sm mb-4"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <Link
          href={`/patients/${appt.patient.id}`}
          className="flex items-center justify-center gap-1.5 text-sm text-primary hover:text-primary-dark border border-border rounded py-2"
        >
          <UserIcon size={14} />
          Ver ficha do paciente
        </Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Novo agendamento — o profissional escolhe data e horário
// manualmente, sem horários pré-definidos na interface.
// ------------------------------------------------------------
function NewAppointmentForm({
  date,
  defaultProfessionalId,
  existingAppointments,
  onCreated,
  onCancel,
}: {
  date: Date;
  defaultProfessionalId: string;
  existingAppointments: Appointment[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const [formDate, setFormDate] = useState(() => formatDateISO(date));
  const [form, setForm] = useState({
    professionalUserId: defaultProfessionalId,
    resourceId: "",
    procedureId: "",
    time: "",
    durationMinutes: 30,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aviso informativo (não bloqueante) dos horários já ocupados por esse
  // profissional na data escolhida — a validação real de conflito é feita
  // no servidor ao salvar.
  const occupiedTimes = useMemo(() => {
    if (!form.professionalUserId) return [];
    return existingAppointments
      .filter(
        (a) =>
          a.professionalUserId === form.professionalUserId &&
          formatDateISO(new Date(a.startsAt)) === formDate &&
          a.status !== "cancelada" &&
          a.status !== "faltou"
      )
      .map((a) => new Date(a.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }))
      .sort();
  }, [existingAppointments, form.professionalUserId, formDate]);

  useEffect(() => {
    fetch("/api/professionals").then((r) => r.ok && r.json()).then((d) => d && setProfessionals(d.professionals));
    fetch("/api/clinical-resources").then((r) => r.ok && r.json()).then((d) => d && setResources(d.resources));
    fetch("/api/procedures").then((r) => r.ok && r.json()).then((d) => d && setProcedures(d.procedures));
  }, []);

  useEffect(() => {
    if (!patientQuery.trim()) {
      setPatientResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(patientQuery)}`);
      if (res.ok) setPatientResults((await res.json()).patients);
    }, 250);
    return () => clearTimeout(timeout);
  }, [patientQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Selecione um paciente.");
      return;
    }
    if (!form.time) {
      setError("Informe o horário do atendimento.");
      return;
    }
    setSaving(true);
    setError(null);

    const [year, month, day] = formDate.split("-").map(Number);
    const [hours, minutes] = form.time.split(":").map(Number);
    const startsAt = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: selectedPatient.id,
        professionalUserId: form.professionalUserId,
        resourceId: form.resourceId || null,
        procedureId: form.procedureId || null,
        startsAt: startsAt.toISOString(),
        durationMinutes: form.durationMinutes,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar agendamento.");
      return;
    }
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-border rounded-lg shadow-lg w-full max-w-md p-5 space-y-4 animate-fade-in-up my-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Novo agendamento</h2>
          <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {error && <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">{error}</div>}

        <div className="relative">
          <label className="block text-xs text-ink-muted mb-1">Paciente</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
              <span className="text-ink">{selectedPatient.name}</span>
              <button type="button" onClick={() => setSelectedPatient(null)} className="text-ink-muted hover:text-alert">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Buscar paciente por nome..."
                className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {patientResults.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-border rounded mt-1 max-h-48 overflow-y-auto shadow-sm">
                  {patientResults.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientQuery("");
                          setPatientResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface"
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Profissional</label>
            <select
              required
              value={form.professionalUserId}
              onChange={(e) => setForm((f) => ({ ...f, professionalUserId: e.target.value }))}
              className="w-full rounded border border-border px-2 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {professionals.length === 0 && (
              <p className="text-[11px] text-alert mt-1">
                Nenhum usuário com papel "Profissional" na clínica ainda.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Sala/cadeira</label>
            <select
              value={form.resourceId}
              onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))}
              className="w-full rounded border border-border px-2 py-2 text-sm"
            >
              <option value="">Nenhuma</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {resources.length === 0 && (
              <p className="text-[11px] text-ink-muted mt-1">
                <Link href="/settings" className="text-primary hover:text-primary-dark">
                  Cadastrar sala/cadeira
                </Link>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Data</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Horário</label>
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        {occupiedTimes.length > 0 && (
          <p className="text-[11px] text-ink-muted -mt-2">
            Horários já ocupados para esse profissional neste dia: {occupiedTimes.join(", ")}
          </p>
        )}

        <div>
          <label className="block text-xs text-ink-muted mb-1">Duração</label>
          <DurationPicker
            value={form.durationMinutes}
            onChange={(durationMinutes) => setForm((f) => ({ ...f, durationMinutes }))}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-muted mb-1">Procedimento (opcional)</label>
          <select
            value={form.procedureId}
            onChange={(e) => setForm((f) => ({ ...f, procedureId: e.target.value }))}
            className="w-full rounded border border-border px-2 py-2 text-sm"
          >
            <option value="">Nenhum</option>
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-ink-muted mb-1">Observações</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded border border-border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Agendando..." : "Confirmar agendamento"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink border border-border rounded transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

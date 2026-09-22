"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, X, Clock, User as UserIcon } from "lucide-react";
import { TimeSlotPicker } from "@/components/ui/TimeSlotPicker";
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

const STATUS_DOT: Record<string, string> = {
  agendada: "bg-ink-muted",
  confirmada: "bg-primary",
  em_atendimento: "bg-primary-light",
  concluida: "bg-primary-dark",
  cancelada: "bg-alert",
  faltou: "bg-alert",
};

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const PX_PER_MIN = 1.6;
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * 60 * PX_PER_MIN;

function formatDateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesSinceGridStart(dateStr: string) {
  const d = new Date(dateStr);
  return (d.getHours() - GRID_START_HOUR) * 60 + d.getMinutes();
}

export default function AgendaPage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    fetch("/api/professionals").then((r) => r.ok && r.json()).then((d) => d && setProfessionals(d.professionals));
  }, []);

  useEffect(() => {
    load();
  }, [date, view]);

  async function load() {
    setLoading(true);
    const rangeStart = view === "day" ? new Date(date) : startOfWeek(date);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + (view === "day" ? 1 : 7));
    rangeEnd.setMilliseconds(-1);

    const res = await fetch(`/api/appointments?from=${rangeStart.toISOString()}&to=${rangeEnd.toISOString()}`);
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

  function shiftPeriod(delta: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + delta * (view === "day" ? 1 : 7));
    setDate(next);
  }

  const filteredAppointments = useMemo(
    () =>
      professionalFilter === "all"
        ? appointments
        : appointments.filter((a) => a.professionalUserId === professionalFilter),
    [appointments, professionalFilter]
  );

  const columnsProfessionals =
    professionalFilter === "all" ? professionals : professionals.filter((p) => p.id === professionalFilter);

  const isToday = formatDateISO(date) === formatDateISO(new Date());
  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">Agenda</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-surface border border-border rounded p-0.5">
          <button
            onClick={() => setView("day")}
            className={`text-xs px-3 py-1.5 rounded ${view === "day" ? "bg-white shadow-sm text-ink font-medium" : "text-ink-muted"}`}
          >
            Dia
          </button>
          <button
            onClick={() => setView("week")}
            className={`text-xs px-3 py-1.5 rounded ${view === "week" ? "bg-white shadow-sm text-ink font-medium" : "text-ink-muted"}`}
          >
            Semana
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => shiftPeriod(-1)} className="p-1.5 border border-border rounded hover:bg-surface">
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-medium text-ink min-w-[190px] text-center">
            {view === "day"
              ? date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
              : `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} – ${weekDays[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
            {isToday && view === "day" && <span className="text-primary"> · hoje</span>}
          </p>
          <button onClick={() => shiftPeriod(1)} className="p-1.5 border border-border rounded hover:bg-surface">
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button onClick={() => setDate(new Date())} className="text-xs text-primary hover:text-primary-dark ml-1">
              Hoje
            </button>
          )}
        </div>

        <select
          value={professionalFilter}
          onChange={(e) => setProfessionalFilter(e.target.value)}
          className="text-sm border border-border rounded px-3 py-1.5 bg-white ml-auto"
        >
          <option value="all">Todos os profissionais</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <NewAppointmentForm
          date={date}
          defaultProfessionalId={professionalFilter !== "all" ? professionalFilter : ""}
          existingAppointments={appointments}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && <p className="text-sm text-ink-muted py-8 text-center">Carregando...</p>}

      {!loading && view === "day" && (
        <DayGrid
          appointments={filteredAppointments}
          columnsProfessionals={columnsProfessionals}
          showColumns={professionalFilter === "all" && professionals.length > 1}
          onSelect={setSelectedAppt}
        />
      )}

      {!loading && view === "week" && (
        <WeekOverview
          weekDays={weekDays}
          appointments={filteredAppointments}
          onSelectDay={(d) => {
            setDate(d);
            setView("day");
          }}
          onSelect={setSelectedAppt}
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
// Grade de horários do dia — colunas por profissional
// ------------------------------------------------------------
function DayGrid({
  appointments,
  columnsProfessionals,
  showColumns,
  onSelect,
}: {
  appointments: Appointment[];
  columnsProfessionals: Professional[];
  showColumns: boolean;
  onSelect: (a: Appointment) => void;
}) {
  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
  const columns = showColumns && columnsProfessionals.length > 0 ? columnsProfessionals : [null];

  return (
    <div className="bg-white border border-border rounded overflow-hidden">
      <div className="flex">
        {/* Coluna de horários */}
        <div className="w-14 shrink-0 border-r border-border">
          <div className="h-10 border-b border-border" />
          <div style={{ height: GRID_HEIGHT }} className="relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-[11px] text-ink-muted text-right pr-2 -translate-y-2"
                style={{ top: (h - GRID_START_HOUR) * 60 * PX_PER_MIN }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {/* Colunas de profissionais */}
        <div className="flex-1 flex overflow-x-auto">
          {columns.map((prof, colIndex) => {
            const colAppointments = prof
              ? appointments.filter((a) => a.professionalUserId === prof.id)
              : appointments;

            return (
              <div key={prof?.id ?? "single"} className={`flex-1 min-w-[220px] ${colIndex > 0 ? "border-l border-border" : ""}`}>
                {showColumns && (
                  <div className="h-10 border-b border-border flex items-center justify-center px-2">
                    <p className="text-xs font-medium text-ink truncate">{prof?.name ?? "—"}</p>
                  </div>
                )}
                {!showColumns && <div className="h-10 border-b border-border" />}

                <div className="relative" style={{ height: GRID_HEIGHT }}>
                  {/* Linhas de hora */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/70"
                      style={{ top: (h - GRID_START_HOUR) * 60 * PX_PER_MIN }}
                    />
                  ))}

                  {colAppointments.map((appt) => {
                    const top = Math.max(0, minutesSinceGridStart(appt.startsAt) * PX_PER_MIN);
                    const height = Math.max(22, appt.durationMinutes * PX_PER_MIN - 2);
                    return (
                      <button
                        key={appt.id}
                        onClick={() => onSelect(appt)}
                        className={`absolute left-1 right-1 rounded border px-2 py-1 text-left overflow-hidden hover:shadow-sm transition-shadow ${STATUS_COLORS[appt.status]}`}
                        style={{ top, height }}
                      >
                        <p className="text-[11px] font-medium leading-tight truncate">
                          {new Date(appt.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {appt.patient.name}
                        </p>
                        {height > 32 && (
                          <p className="text-[10px] leading-tight truncate opacity-80">
                            {appt.procedure?.name ?? "Sem procedimento"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Visão semanal — 7 colunas, lista compacta por dia
// ------------------------------------------------------------
function WeekOverview({
  weekDays,
  appointments,
  onSelectDay,
  onSelect,
}: {
  weekDays: Date[];
  appointments: Appointment[];
  onSelectDay: (d: Date) => void;
  onSelect: (a: Appointment) => void;
}) {
  const todayStr = formatDateISO(new Date());

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => {
        const dayStr = formatDateISO(day);
        const dayAppointments = appointments
          .filter((a) => formatDateISO(new Date(a.startsAt)) === dayStr)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        const isToday = dayStr === todayStr;

        return (
          <div key={dayStr} className="bg-white border border-border rounded overflow-hidden flex flex-col">
            <button
              onClick={() => onSelectDay(day)}
              className={`text-center py-2 border-b border-border hover:bg-surface ${isToday ? "bg-primary/5" : ""}`}
            >
              <p className="text-[11px] text-ink-muted uppercase">
                {day.toLocaleDateString("pt-BR", { weekday: "short" })}
              </p>
              <p className={`text-sm font-medium ${isToday ? "text-primary" : "text-ink"}`}>
                {day.getDate()}
              </p>
            </button>
            <div className="flex-1 p-1.5 space-y-1 min-h-[120px]">
              {dayAppointments.length === 0 && (
                <p className="text-[11px] text-ink-muted/60 text-center pt-3">—</p>
              )}
              {dayAppointments.map((appt) => (
                <button
                  key={appt.id}
                  onClick={() => onSelect(appt)}
                  className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-surface"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[appt.status]}`} />
                  <span className="text-[11px] text-ink-muted shrink-0">
                    {new Date(appt.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[11px] text-ink truncate">{appt.patient.name}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
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

  const [form, setForm] = useState({
    professionalUserId: defaultProfessionalId,
    resourceId: "",
    procedureId: "",
    time: "09:00",
    durationMinutes: 30,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabledSlots = useMemo(() => {
    if (!form.professionalUserId) return [];
    const dayStr = formatDateISO(date);
    return existingAppointments
      .filter((a) => a.professionalUserId === form.professionalUserId && formatDateISO(new Date(a.startsAt)) === dayStr)
      .map((a) => new Date(a.startsAt).toTimeString().slice(0, 5));
  }, [existingAppointments, form.professionalUserId, date]);

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
    setSaving(true);
    setError(null);

    const [hours, minutes] = form.time.split(":").map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(hours, minutes, 0, 0);

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
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 mb-4 space-y-4">
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
          <label className="block text-xs text-ink-muted mb-1">Horário — {form.time}</label>
          <TimeSlotPicker
            value={form.time}
            onChange={(time) => setForm((f) => ({ ...f, time }))}
            disabledSlots={disabledSlots}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-muted mb-1">Duração</label>
          <DurationPicker
            value={form.durationMinutes}
            onChange={(durationMinutes) => setForm((f) => ({ ...f, durationMinutes }))}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink-muted mb-1">Procedimento (opcional)</label>
        <select
          value={form.procedureId}
          onChange={(e) => setForm((f) => ({ ...f, procedureId: e.target.value }))}
          className="w-full max-w-xs rounded border border-border px-2 py-2 text-sm"
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

      <button
        type="submit"
        disabled={saving}
        className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
      >
        {saving ? "Agendando..." : "Confirmar agendamento"}
      </button>
    </form>
  );
}

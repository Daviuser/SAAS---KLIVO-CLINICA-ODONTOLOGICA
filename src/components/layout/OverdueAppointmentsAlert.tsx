"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type OverdueAppointment = {
  id: string;
  patientId: string;
  patientName: string;
  procedureName: string | null;
  professionalName: string | null;
  startsAt: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const POLL_MS = 30_000;

export function OverdueAppointmentsAlert() {
  const [items, setItems] = useState<OverdueAppointment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments/overdue");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.overdue ?? []);
    } catch {
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function updateStatus(id: string, status: "em_atendimento" | "faltou") {
    setBusyId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setErrorId(id);
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  }

  if (!loaded || items.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 w-[min(380px,calc(100vw-2rem))]">
      <div className="bg-white border border-alert/30 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-alert/5 hover:bg-alert/10 transition-colors text-left"
        >
          <AlertTriangle size={17} className="text-alert shrink-0" strokeWidth={2} />
          <span className="text-sm font-medium text-ink flex-1">
            {items.length === 1
              ? "1 consulta confirmada passou do horário"
              : `${items.length} consultas confirmadas passaram do horário`}
          </span>
          {collapsed ? (
            <ChevronDown size={16} className="text-ink-muted shrink-0" />
          ) : (
            <ChevronUp size={16} className="text-ink-muted shrink-0" />
          )}
        </button>

        {!collapsed && (
          <>
            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
              {items.map((appt) => (
                <li key={appt.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={13} className="text-alert shrink-0" strokeWidth={2} />
                    <span className="text-ink font-medium truncate">{appt.patientName}</span>
                    <span className="text-xs text-ink-muted shrink-0">{formatTime(appt.startsAt)}</span>
                  </div>
                  {(appt.professionalName || appt.procedureName) && (
                    <p className="text-xs text-ink-muted mt-0.5 ml-[21px] truncate">
                      {[appt.professionalName, appt.procedureName].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 ml-[21px]">
                    <button
                      disabled={busyId === appt.id}
                      onClick={() => updateStatus(appt.id, "em_atendimento")}
                      className="text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      Iniciar atendimento
                    </button>
                    <button
                      disabled={busyId === appt.id}
                      onClick={() => updateStatus(appt.id, "faltou")}
                      className="text-xs px-2.5 py-1 rounded border border-alert/30 text-alert hover:bg-alert/5 disabled:opacity-50"
                    >
                      Marcar falta
                    </button>
                    {busyId === appt.id && <Loader2 size={13} className="animate-spin text-ink-muted" />}
                  </div>
                  {errorId === appt.id && (
                    <p className="text-xs text-alert mt-1 ml-[21px]">
                      Não foi possível atualizar. Tente pela agenda.
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="px-4 py-2.5 border-t border-border bg-surface">
              <Link href="/agenda" className="text-xs text-primary hover:text-primary-dark">
                Ver agenda completa →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
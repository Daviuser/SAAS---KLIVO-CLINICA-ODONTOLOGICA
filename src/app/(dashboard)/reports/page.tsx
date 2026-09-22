"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, AlertTriangle, TrendingUp, FileBarChart } from "lucide-react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

type ReportData = {
  totalRevenue: number;
  revenueByDay: { date: string; amount: number }[];
  productionByProfessional: { professionalUserId: string; name: string; total: number }[];
  overdue: { id: string; patientId: string; patientName: string; amount: number; dueDate: string }[];
  totalOverdue: number;
  paidCount: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function generateReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/summary?from=${new Date(from).toISOString()}&to=${new Date(to + "T23:59:59").toISOString()}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Erro ao gerar relatório (status ${res.status}).`);
        setData(null);
      } else {
        setData(await res.json());
      }
    } catch {
      setError("Não foi possível conectar ao servidor.");
      setData(null);
    }
    setHasGenerated(true);
    setLoading(false);
  }

  const maxDayRevenue = data ? Math.max(...data.revenueByDay.map((d) => d.amount), 1) : 1;
  const maxProduction = data ? Math.max(...data.productionByProfessional.map((p) => p.total), 1) : 1;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display text-2xl text-ink mb-1">Relatórios</h1>
      <p className="text-sm text-ink-muted mb-6">Faturamento, inadimplência e produção por profissional</p>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
        <div className="flex-1">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-5 py-2.5 transition-colors disabled:opacity-60 h-[42px]"
        >
          <FileBarChart size={15} />
          {loading ? "Gerando..." : "Gerar relatório"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {!hasGenerated && !error && (
        <p className="text-sm text-ink-muted">
          Escolha um período acima e clique em "Gerar relatório".
        </p>
      )}

      {hasGenerated && !loading && !error && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-border rounded p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">Faturamento no período</p>
                <Wallet size={16} className="text-primary/60" strokeWidth={1.75} />
              </div>
              <p className="font-display text-2xl text-ink mt-2">{formatCurrency(data.totalRevenue)}</p>
              <p className="text-xs text-ink-muted mt-1">{data.paidCount} parcela(s) paga(s)</p>
            </div>
            <div className="bg-white border border-border rounded p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">Inadimplência (total vencido)</p>
                <AlertTriangle size={16} className="text-alert/70" strokeWidth={1.75} />
              </div>
              <p className="font-display text-2xl text-alert mt-2">{formatCurrency(data.totalOverdue)}</p>
              <p className="text-xs text-ink-muted mt-1">{data.overdue.length} parcela(s) vencida(s)</p>
            </div>
            <div className="bg-white border border-border rounded p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">Ticket médio por parcela</p>
                <TrendingUp size={16} className="text-primary/60" strokeWidth={1.75} />
              </div>
              <p className="font-display text-2xl text-ink mt-2">
                {formatCurrency(data.paidCount ? data.totalRevenue / data.paidCount : 0)}
              </p>
            </div>
          </div>

          {/* Faturamento por dia */}
          <section className="bg-white border border-border rounded p-5 mb-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Faturamento por dia</h2>
            {data.revenueByDay.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhum recebimento no período selecionado.</p>
            ) : (
              <div className="space-y-2">
                {data.revenueByDay.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted w-20 shrink-0">
                      {new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <div className="flex-1 bg-surface rounded h-5 relative overflow-hidden">
                      <div
                        className="bg-primary/80 h-full rounded"
                        style={{ width: `${(day.amount / maxDayRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink w-24 text-right shrink-0">{formatCurrency(day.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Produção por profissional */}
          <section className="bg-white border border-border rounded p-5 mb-6">
            <h2 className="text-sm font-semibold text-ink mb-4">Produção por profissional</h2>
            {data.productionByProfessional.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nenhum recebimento vinculado a um profissional responsável no período.
              </p>
            ) : (
              <div className="space-y-2">
                {data.productionByProfessional.map((prof) => (
                  <div key={prof.professionalUserId} className="flex items-center gap-3">
                    <span className="text-xs text-ink w-32 shrink-0 truncate">{prof.name}</span>
                    <div className="flex-1 bg-surface rounded h-5 relative overflow-hidden">
                      <div
                        className="bg-primary-light/70 h-full rounded"
                        style={{ width: `${(prof.total / maxProduction) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink w-24 text-right shrink-0">{formatCurrency(prof.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Inadimplência */}
          <section className="bg-white border border-border rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-ink">Parcelas vencidas</h2>
            </div>
            {data.overdue.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-muted">Nenhuma parcela vencida. 🎉</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface text-ink-muted text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Paciente</th>
                    <th className="px-4 py-2 font-medium">Vencimento</th>
                    <th className="px-4 py-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdue.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <Link href={`/patients/${o.patientId}/orcamentos`} className="text-primary hover:underline">
                          {o.patientName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-alert">{new Date(o.dueDate).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(o.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}


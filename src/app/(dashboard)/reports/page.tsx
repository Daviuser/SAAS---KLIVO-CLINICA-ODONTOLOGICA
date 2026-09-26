"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  AlertTriangle,
  TrendingUp,
  FileBarChart,
  Loader2,
  ClipboardList,
  SearchX,
} from "lucide-react";
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

// Barra horizontal que "cresce" do zero até o valor real quando entra na
// tela — em vez de já nascer preenchida. O atraso (delayMs) é usado para
// escalonar várias barras em sequência, dando um efeito de lista animada.
function AnimatedBar({
  fraction,
  colorClassName,
  delayMs = 0,
}: {
  fraction: number;
  colorClassName: string;
  delayMs?: number;
}) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 30 + delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return (
    <div className="flex-1 bg-surface rounded h-5 relative overflow-hidden">
      <div
        className={`h-full rounded transition-[width] duration-700 ease-out ${colorClassName}`}
        style={{ width: `${grown ? Math.min(fraction, 1) * 100 : 0}%` }}
      />
    </div>
  );
}

// Envelope que faz o conteúdo entrar com um leve fade + subida, ao invés
// de simplesmente "aparecer". Usado em cards/seções do relatório.
function FadeIn({
  children,
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20 + delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface rounded ${className}`} />;
}

export default function ReportsPage() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  // Muda a cada geração bem-sucedida — usado como `key` para forçar o
  // React a remontar a área de resultados e replay das animações de
  // entrada, mesmo que o novo relatório tenha o mesmo "formato" do antigo.
  const [reportVersion, setReportVersion] = useState(0);

  // Evita que uma resposta antiga (de um clique anterior, ainda em voo)
  // sobrescreva o resultado de uma geração mais recente.
  const requestIdRef = useRef(0);

  async function generateReport() {
    if (loading) return; // trava contra duplo clique
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setData(null); // nunca mantém o relatório anterior visível durante uma nova geração

    try {
      const res = await fetch(
        `/api/reports/summary?from=${new Date(from).toISOString()}&to=${new Date(to + "T23:59:59").toISOString()}`
      );

      if (requestId !== requestIdRef.current) return; // resposta obsoleta — ignora

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Erro ao gerar relatório (status ${res.status}).`);
        setData(null);
      } else {
        const json = await res.json();
        setData(json);
        setReportVersion((v) => v + 1);
      }
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Não foi possível conectar ao servidor.");
      setData(null);
    }

    if (requestId === requestIdRef.current) {
      setHasGenerated(true);
      setLoading(false);
    }
  }

  const maxDayRevenue = data ? Math.max(...data.revenueByDay.map((d) => d.amount), 1) : 1;
  const maxProduction = data ? Math.max(...data.productionByProfessional.map((p) => p.total), 1) : 1;

  const isTrulyEmpty =
    !!data && data.paidCount === 0 && data.productionByProfessional.length === 0 && data.overdue.length === 0;

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
          aria-busy={loading}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-5 py-2.5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed h-[42px] min-w-[168px]"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <FileBarChart size={15} />
              Gerar relatório
            </>
          )}
        </button>
      </div>

      {error && !loading && (
        <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Estado inicial — antes de qualquer geração */}
      {!hasGenerated && !loading && !error && (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-dashed border-border rounded">
          <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-primary/70" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-ink mb-1">Nenhum relatório gerado ainda</p>
          <p className="text-sm text-ink-muted max-w-sm">
            Selecione os filtros e clique em <span className="font-medium text-ink">"Gerar relatório"</span> para
            visualizar seus resultados.
          </p>
        </div>
      )}

      {/* Estado de carregamento — some com o relatório anterior e mostra placeholders */}
      {loading && (
        <div aria-live="polite" aria-label="Gerando relatório">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-border rounded p-5">
                <SkeletonBlock className="h-3.5 w-2/3 mb-3" />
                <SkeletonBlock className="h-7 w-1/2" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-border rounded p-5 mb-6">
            <SkeletonBlock className="h-3.5 w-40 mb-4" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <SkeletonBlock key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-ink-muted py-4">
            <Loader2 size={14} className="animate-spin" />
            Buscando os dados no banco e calculando os indicadores...
          </div>
        </div>
      )}

      {/* Relatório sem nenhum dado no sistema para os filtros aplicados */}
      {hasGenerated && !loading && !error && data && isTrulyEmpty && (
        <FadeIn key={reportVersion}>
          <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-border rounded">
            <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mb-4">
              <SearchX size={24} className="text-ink-muted/60" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-ink mb-1">Nenhum dado encontrado para os filtros selecionados</p>
            <p className="text-sm text-ink-muted max-w-sm">
              Não há recebimentos, produção ou pendências registradas no período escolhido. Tente ampliar o
              intervalo de datas ou selecionar outro período.
            </p>
          </div>
        </FadeIn>
      )}

      {/* Relatório completo */}
      {hasGenerated && !loading && !error && data && !isTrulyEmpty && (
        <div key={reportVersion}>
          <FadeIn className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
          </FadeIn>

          {/* Faturamento por dia */}
          <FadeIn delayMs={80} className="mb-6">
            <section className="bg-white border border-border rounded p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Faturamento por dia</h2>
              {data.revenueByDay.length === 0 ? (
                <p className="text-sm text-ink-muted">Nenhum recebimento no período selecionado.</p>
              ) : (
                <div className="space-y-2">
                  {data.revenueByDay.map((day, i) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-ink-muted w-20 shrink-0">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <AnimatedBar
                        fraction={day.amount / maxDayRevenue}
                        colorClassName="bg-primary/80"
                        delayMs={i * 40}
                      />
                      <span className="text-xs text-ink w-24 text-right shrink-0">{formatCurrency(day.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          {/* Produção por profissional */}
          <FadeIn delayMs={140} className="mb-6">
            <section className="bg-white border border-border rounded p-5">
              <h2 className="text-sm font-semibold text-ink mb-4">Produção por profissional</h2>
              {data.productionByProfessional.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Nenhum recebimento vinculado a um profissional responsável no período.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.productionByProfessional.map((prof, i) => (
                    <div key={prof.professionalUserId} className="flex items-center gap-3">
                      <span className="text-xs text-ink w-32 shrink-0 truncate">{prof.name}</span>
                      <AnimatedBar
                        fraction={prof.total / maxProduction}
                        colorClassName="bg-primary-light/70"
                        delayMs={i * 40}
                      />
                      <span className="text-xs text-ink w-24 text-right shrink-0">{formatCurrency(prof.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          {/* Inadimplência */}
          <FadeIn delayMs={200}>
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
          </FadeIn>
        </div>
      )}
    </div>
  );
}

"use client";

import { AnimatedVerticalBar } from "./Animated";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCurrencyCompact(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${value.toFixed(0)}`;
}

export function RevenueChart({
  months,
}: {
  months: { label: string; value: number; isCurrent: boolean }[];
}) {
  const max = Math.max(...months.map((m) => m.value), 1);
  // 4 linhas de grade, do topo (max arredondado) até zero
  const niceMax = max <= 0 ? 100 : Math.ceil(max / 4) * 4 || max;
  const gridLines = [1, 0.75, 0.5, 0.25, 0];
  const current = months.find((m) => m.isCurrent);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-semibold text-ink">Faturamento dos últimos 6 meses</h2>
        {current && (
          <div className="text-right">
            <p className="font-display text-lg text-ink leading-none">{formatCurrency(current.value)}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{current.label}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {/* Eixo Y */}
        <div className="flex flex-col justify-between h-48 text-[10px] text-ink-muted/70 shrink-0 py-0.5">
          {gridLines.map((f) => (
            <span key={f}>{formatCurrencyCompact(niceMax * f)}</span>
          ))}
        </div>

        {/* Área do gráfico */}
        <div className="flex-1 relative h-48">
          {/* linhas de grade discretas */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {gridLines.map((f) => (
              <div key={f} className="border-t border-border/70 w-full" />
            ))}
          </div>

          <div className="relative h-full flex items-end gap-3 sm:gap-5 px-1">
            {months.map((m, i) => (
              <div key={m.label} className="flex-1 h-full flex flex-col items-center justify-end">
                <AnimatedVerticalBar
                  heightFraction={m.value / niceMax}
                  delayMs={i * 90}
                  className={
                    m.isCurrent
                      ? "bg-gradient-to-t from-primary to-primary-light"
                      : "bg-gradient-to-t from-primary/50 to-primary-light/50"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rótulos dos meses */}
      <div className="flex gap-3 mt-2 pl-[42px]">
        <div className="flex-1 flex gap-3 sm:gap-5 px-1">
          {months.map((m) => (
            <p
              key={m.label}
              className={`flex-1 text-center text-xs ${
                m.isCurrent ? "text-primary font-semibold" : "text-ink-muted"
              }`}
            >
              {m.label}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

// Entrada suave (fade + leve subida) para cards e seções.
export function FadeIn({
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

// Barra vertical que cresce de 0 até a altura real ao entrar na tela —
// usada no gráfico principal de faturamento.
export function AnimatedVerticalBar({
  heightFraction,
  className = "",
  delayMs = 0,
}: {
  heightFraction: number;
  className?: string;
  delayMs?: number;
}) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 30 + delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return (
    <div className="flex-1 flex items-end h-full">
      <div
        className={`w-full rounded-t transition-[height] duration-700 ease-out ${className}`}
        style={{ height: `${grown ? Math.max(Math.min(heightFraction, 1), 0.015) * 100 : 0}%` }}
      />
    </div>
  );
}

// Mini gráfico de linha (sparkline) decorativo — desenha o traçado com uma
// animação de "stroke" (linha se desenhando) ao entrar na tela.
export function Sparkline({
  values,
  className = "",
  strokeWidth = 2,
}: {
  values: number[];
  className?: string;
  strokeWidth?: number;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const w = 100;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = points.join(" ");
  // comprimento aproximado do traçado, só para calibrar a animação
  const approxLength = w * 1.6;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <polyline
        points={path}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          stroke: "currentColor",
          strokeDasharray: approxLength,
          strokeDashoffset: drawn ? 0 : approxLength,
          transition: "stroke-dashoffset 900ms ease-out",
        }}
      />
    </svg>
  );
}

// Mini gráfico de barras decorativo (usado dentro do card de Faturamento
// do mês) — mesma lógica de "crescer" do AnimatedVerticalBar, só que em
// miniatura e sem eixo.
export function MiniBarSparkline({ values, className = "" }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex items-end gap-0.5 h-8 ${className}`}>
      {values.map((v, i) => (
        <AnimatedVerticalBar
          key={i}
          heightFraction={v / max}
          delayMs={i * 60}
          className="bg-current rounded-[1.5px]"
        />
      ))}
    </div>
  );
}

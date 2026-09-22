"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildPresets() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  return [
    { label: "Hoje", from: today, to: today },
    { label: "Últimos 7 dias", from: sevenDaysAgo, to: today },
    { label: "Este mês", from: startOfMonth, to: today },
    { label: "Mês passado", from: startOfLastMonth, to: endOfLastMonth },
    { label: "Este ano", from: startOfYear, to: today },
  ];
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const presets = buildPresets();

  return (
    <div className="bg-white border border-border rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-ink-muted" strokeWidth={1.75} />
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Período</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {presets.map((preset) => {
          const presetFrom = toISODate(preset.from);
          const presetTo = toISODate(preset.to);
          const isActive = !showCustom && from === presetFrom && to === presetTo;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setShowCustom(false);
                onChange(presetFrom, presetTo);
              }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                isActive
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-ink border-border hover:border-primary hover:text-primary"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCustom((s) => !s)}
          className={`text-xs px-3 py-1.5 rounded border transition-colors ${
            showCustom
              ? "bg-primary text-white border-primary"
              : "bg-white text-ink border-border hover:border-primary hover:text-primary"
          }`}
        >
          Período personalizado
        </button>
      </div>

      {showCustom && (
        <div className="flex items-end gap-3 pt-1">
          <div>
            <label className="block text-xs text-ink-muted mb-1">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onChange(e.target.value, to)}
              className="rounded border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onChange(from, e.target.value)}
              className="rounded border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {!showCustom && (
        <p className="text-xs text-ink-muted">
          {new Date(from + "T12:00:00").toLocaleDateString("pt-BR")} até{" "}
          {new Date(to + "T12:00:00").toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}

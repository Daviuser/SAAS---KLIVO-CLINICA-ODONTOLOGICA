"use client";

import { useState } from "react";

const COMMON_DURATIONS = [15, 30, 45, 60, 90, 120];

export function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const [customMode, setCustomMode] = useState(!COMMON_DURATIONS.includes(value));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_DURATIONS.map((mins) => {
          const isSelected = !customMode && value === mins;
          return (
            <button
              key={mins}
              type="button"
              onClick={() => {
                setCustomMode(false);
                onChange(mins);
              }}
              className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                isSelected
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-ink border-border hover:border-primary hover:text-primary"
              }`}
            >
              {mins < 60 ? `${mins} min` : `${mins / 60}h${mins % 60 ? `${mins % 60}` : ""}`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
            customMode
              ? "bg-primary text-white border-primary"
              : "bg-white text-ink border-border hover:border-primary hover:text-primary"
          }`}
        >
          Outro
        </button>
      </div>

      {customMode && (
        <input
          type="number"
          min={5}
          step={5}
          autoFocus
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 30)}
          className="mt-2 w-24 rounded border border-border px-2 py-1.5 text-sm"
          placeholder="Minutos"
        />
      )}
    </div>
  );
}

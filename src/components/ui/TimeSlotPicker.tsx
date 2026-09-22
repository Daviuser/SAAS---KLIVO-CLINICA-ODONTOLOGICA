"use client";

// Grade de horários clicáveis — substitui o <input type="time"> nativo,
// que é lento de usar (precisa digitar ou usar spinner) numa tela onde
// a pessoa vai escolher o mesmo tipo de horário dezenas de vezes por dia.

function buildSlots(startHour: number, endHour: number, stepMinutes: number) {
  const slots: string[] = [];
  for (let mins = startHour * 60; mins < endHour * 60; mins += stepMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function TimeSlotPicker({
  value,
  onChange,
  startHour = 7,
  endHour = 20,
  stepMinutes = 15,
  disabledSlots = [],
}: {
  value: string;
  onChange: (time: string) => void;
  startHour?: number;
  endHour?: number;
  stepMinutes?: number;
  disabledSlots?: string[];
}) {
  const slots = buildSlots(startHour, endHour, stepMinutes);
  const disabledSet = new Set(disabledSlots);

  // Agrupa por hora cheia, pra renderizar uma "linha" por hora — fica
  // mais fácil de escanear visualmente do que uma lista corrida.
  const groupedByHour = slots.reduce<Record<string, string[]>>((acc, slot) => {
    const hour = slot.slice(0, 2);
    (acc[hour] ??= []).push(slot);
    return acc;
  }, {});

  return (
    <div className="border border-border rounded max-h-52 overflow-y-auto">
      {Object.entries(groupedByHour).map(([hour, hourSlots]) => (
        <div key={hour} className="flex items-stretch border-b border-border last:border-b-0">
          <div className="w-12 shrink-0 flex items-center justify-center text-xs text-ink-muted bg-surface border-r border-border">
            {hour}h
          </div>
          <div className="flex flex-wrap gap-1.5 p-1.5 flex-1">
            {hourSlots.map((slot) => {
              const isSelected = slot === value;
              const isDisabled = disabledSet.has(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onChange(slot)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : isDisabled
                      ? "bg-surface text-ink-muted/40 border-border cursor-not-allowed line-through"
                      : "bg-white text-ink border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

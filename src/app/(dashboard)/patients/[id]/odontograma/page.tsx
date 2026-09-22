"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ToothRecord = {
  toothNumber: string;
  condition: string | null;
  plannedProcedure: string | null;
  performedProcedure: string | null;
  notes: string | null;
};

// Notação FDI — arcada superior e inferior, 8 dentes por quadrante.
const UPPER_TEETH = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const LOWER_TEETH = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

const CONDITION_COLORS: Record<string, string> = {
  higido: "bg-white",
  cariado: "bg-red-200",
  restaurado: "bg-blue-200",
  ausente: "bg-gray-300",
  implante: "bg-yellow-200",
};

const CONDITION_LABELS: Record<string, string> = {
  higido: "Hígido",
  cariado: "Cariado",
  restaurado: "Restaurado",
  ausente: "Ausente",
  implante: "Implante",
};

export default function OdontogramaPage() {
  const { id } = useParams<{ id: string }>();
  const [teeth, setTeeth] = useState<Record<string, ToothRecord>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ToothRecord>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/patients/${id}/odontogram`);
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, ToothRecord> = {};
      for (const t of data.teeth) map[t.toothNumber] = t;
      setTeeth(map);
    }
    setLoading(false);
  }

  function selectTooth(toothNumber: string) {
    setSelected(toothNumber);
    setForm(teeth[toothNumber] ?? { toothNumber, condition: "higido" });
  }

  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveTooth() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/patients/${id}/odontogram`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, toothNumber: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? `Erro ao salvar (status ${res.status}).`);
        setSaving(false);
        return;
      }
      const data = await res.json();
      setTeeth((prev) => ({ ...prev, [selected]: data.tooth }));
    } catch (err) {
      setSaveError("Não foi possível conectar ao servidor.");
    }
    setSaving(false);
  }

  function ToothButton({ number }: { number: string }) {
    const record = teeth[number];
    const color = record?.condition ? CONDITION_COLORS[record.condition] ?? "bg-white" : "bg-white";
    return (
      <button
        onClick={() => selectTooth(number)}
        className={`w-9 h-9 border rounded text-xs font-medium flex items-center justify-center hover:ring-2 hover:ring-primary transition ${color} ${
          selected === number ? "ring-2 ring-primary" : "border-border"
        }`}
        title={record?.condition ? CONDITION_LABELS[record.condition] : "Hígido"}
      >
        {number}
      </button>
    );
  }

  if (loading) return <div className="p-8 text-ink-muted/70 text-sm">Carregando odontograma...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Odontograma</h2>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {UPPER_TEETH.map((n) => (
              <ToothButton key={n} number={n} />
            ))}
          </div>
          <div className="flex gap-1">
            {LOWER_TEETH.map((n) => (
              <ToothButton key={n} number={n} />
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-6 text-xs text-ink-muted flex-wrap">
          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm border border-border ${CONDITION_COLORS[key]}`} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="bg-white border border-border rounded p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Dente {selected}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Condição</label>
              <select
                value={form.condition ?? "higido"}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              >
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Tratamento planejado</label>
              <input
                value={form.plannedProcedure ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, plannedProcedure: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Tratamento realizado</label>
              <input
                value={form.performedProcedure ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, performedProcedure: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-1">Observação</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded border border-border px-3 py-2 text-sm"
            />
          </div>

          {saveError && (
            <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2 mb-3">
              {saveError}
            </div>
          )}
          <button
            onClick={saveTooth}
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar dente"}
          </button>
        </div>
      )}
    </div>
  );
}

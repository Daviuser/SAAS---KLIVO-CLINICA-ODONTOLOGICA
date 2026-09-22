"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

type Procedure = {
  id: string;
  name: string;
  category: string | null;
  defaultPrice: string;
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", defaultPrice: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/procedures");
    if (res.ok) {
      const data = await res.json();
      setProcedures(data.procedures);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/procedures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category || null,
        defaultPrice: parseFloat(form.defaultPrice.replace(",", ".")),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar procedimento.");
      return;
    }
    setForm({ name: "", category: "", defaultPrice: "" });
    setShowForm(false);
    load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Procedimentos</h1>
          <p className="text-sm text-ink-muted mt-1">
            Catálogo usado para montar orçamentos
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Novo procedimento
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 mb-6 space-y-4">
          {error && (
            <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink mb-1.5">Nome</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Valor (R$)</label>
              <input
                required
                inputMode="decimal"
                value={form.defaultPrice}
                onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Categoria (opcional)</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Ex: Restauração, Cirurgia, Estética"
              className="w-full max-w-xs rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar procedimento"}
          </button>
        </form>
      )}

      <div className="bg-white border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Valor padrão</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-muted">Carregando...</td></tr>
            )}
            {!loading && procedures.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-muted">Nenhum procedimento cadastrado.</td></tr>
            )}
            {!loading && procedures.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 text-ink font-medium">{p.name}</td>
                <td className="px-4 py-3 text-ink-muted">{p.category ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{formatCurrency(p.defaultPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

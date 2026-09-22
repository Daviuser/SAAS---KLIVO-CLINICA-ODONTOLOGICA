"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, X, Printer } from "lucide-react";

type Procedure = { id: string; name: string; defaultPrice: string };
type BudgetItem = { id: string; procedureName: string; quantity: number; unitPrice: string; discount: string; total: string };
type Budget = {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  items: BudgetItem[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-ink-muted/10 text-ink-muted",
  sent: "bg-primary/10 text-primary",
  approved: "bg-primary-light/15 text-primary-dark",
  rejected: "bg-alert/10 text-alert",
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BudgetsPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
  }, [patientId]);

  async function load() {
    setLoading(true);
    const [budgetsRes, proceduresRes] = await Promise.all([
      fetch(`/api/patients/${patientId}/budgets`),
      fetch("/api/procedures"),
    ]);
    if (budgetsRes.ok) setBudgets((await budgetsRes.json()).budgets);
    if (proceduresRes.ok) setProcedures((await proceduresRes.json()).procedures);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Orçamentos</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Novo orçamento
        </button>
      </div>

      {showForm && (
        <NewBudgetForm
          patientId={patientId}
          procedures={procedures}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading && <p className="text-sm text-ink-muted">Carregando...</p>}
      {!loading && budgets.length === 0 && (
        <p className="text-sm text-ink-muted">Nenhum orçamento criado ainda.</p>
      )}

      <div className="space-y-4">
        {budgets.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function NewBudgetForm({
  patientId,
  procedures,
  onCreated,
}: {
  patientId: string;
  procedures: Procedure[];
  onCreated: () => void;
}) {
  const [items, setItems] = useState<{ procedureId: string; quantity: number; discount: number }[]>([
    { procedureId: "", quantity: 1, discount: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { procedureId: "", quantity: 1, discount: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => {
    const proc = procedures.find((p) => p.id === item.procedureId);
    if (!proc) return sum;
    return sum + Number(proc.defaultPrice) * item.quantity - item.discount;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/patients/${patientId}/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.filter((i) => i.procedureId), notes: notes || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar orçamento.");
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 space-y-4">
      {error && <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">{error}</div>}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-ink-muted mb-1">Procedimento</label>
              <select
                required
                value={item.procedureId}
                onChange={(e) => updateItem(index, { procedureId: e.target.value })}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.defaultPrice)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className="block text-xs text-ink-muted mb-1">Qtd.</label>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-ink-muted mb-1">Desconto (R$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.discount}
                onChange={(e) => updateItem(index, { discount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} className="text-ink-muted hover:text-alert p-2">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addItem} className="text-sm text-primary hover:text-primary-dark">
        + Adicionar procedimento
      </button>

      <div>
        <label className="block text-xs text-ink-muted mb-1">Observações (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border border-border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-sm text-ink-muted">
          Total: <span className="font-display text-lg text-ink">{formatCurrency(total)}</span>
        </p>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Criar orçamento"}
        </button>
      </div>
    </form>
  );
}

function BudgetCard({ budget, onChanged }: { budget: Budget; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = budget.items.reduce((sum, item) => sum + Number(item.total), 0);

  async function changeStatus(status: "sent" | "approved" | "rejected") {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/budgets/${budget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao atualizar orçamento.");
      return;
    }
    onChanged();
  }

  return (
    <div className="bg-white border border-border rounded p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[budget.status]}`}>
          {STATUS_LABELS[budget.status]}
        </span>
        <div className="flex items-center gap-3">
          <a
            href={`/print/orcamento/${budget.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark"
          >
            <Printer size={13} />
            Imprimir / PDF
          </a>
          <p className="text-xs text-ink-muted">{new Date(budget.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <ul className="text-sm space-y-1 mb-3">
        {budget.items.map((item) => (
          <li key={item.id} className="flex justify-between text-ink-muted">
            <span>{item.quantity}x {item.procedureName}</span>
            <span>{formatCurrency(item.total)}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm font-medium text-ink border-t border-border pt-2">
        Total: {formatCurrency(total)}
      </p>

      {error && (
        <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2 mt-3">{error}</div>
      )}

      {budget.status === "draft" && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => changeStatus("sent")} disabled={saving} className="text-sm text-primary hover:text-primary-dark disabled:opacity-60">
            Marcar como enviado
          </button>
          <button onClick={() => changeStatus("approved")} disabled={saving} className="text-sm text-primary hover:text-primary-dark disabled:opacity-60">
            Aprovar
          </button>
          <button onClick={() => changeStatus("rejected")} disabled={saving} className="text-sm text-alert hover:text-alert/80 disabled:opacity-60">
            Recusar
          </button>
        </div>
      )}
      {budget.status === "sent" && (
        <div className="flex gap-2 mt-4">
          <button onClick={() => changeStatus("approved")} disabled={saving} className="text-sm text-primary hover:text-primary-dark disabled:opacity-60">
            Aprovar
          </button>
          <button onClick={() => changeStatus("rejected")} disabled={saving} className="text-sm text-alert hover:text-alert/80 disabled:opacity-60">
            Recusar
          </button>
        </div>
      )}
      {budget.status === "approved" && (
        <p className="text-xs text-ink-muted mt-4">
          Orçamento aprovado. A cobrança de cada procedimento é gerada quando a consulta correspondente
          for marcada como concluída na Agenda.
        </p>
      )}
    </div>
  );
}

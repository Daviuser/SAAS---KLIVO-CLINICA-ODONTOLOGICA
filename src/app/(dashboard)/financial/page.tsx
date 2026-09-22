"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

type Installment = { id: string; number: number; amount: string; dueDate: string; status: string };
type Receivable = {
  id: string;
  description: string;
  totalAmount: string;
  status: string;
  patient: { id: string; name: string };
  installments: Installment[];
};
type Payable = {
  id: string;
  description: string;
  category: string | null;
  amount: string;
  dueDate: string;
  status: string;
};

const RECEIVABLE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  partially_paid: "Parcialmente pago",
  paid: "Pago",
  canceled: "Cancelado",
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinancialPage() {
  const [tab, setTab] = useState<"receivables" | "payables">("receivables");
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      fetch("/api/financial/receivables"),
      fetch("/api/financial/payables"),
    ]);
    if (rRes.ok) setReceivables((await rRes.json()).receivables);
    if (pRes.ok) setPayables((await pRes.json()).payables);
    setLoading(false);
  }

  const totalToReceive = receivables
    .flatMap((r) => r.installments)
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalReceivedThisMonth = receivables
    .flatMap((r) => r.installments)
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalToPay = payables
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display text-2xl text-ink mb-1">Financeiro</h1>
      <p className="text-sm text-ink-muted mb-6">Contas a receber, contas a pagar e fluxo de caixa</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-border rounded p-5">
          <p className="text-sm text-ink-muted">A receber</p>
          <p className="font-display text-2xl text-ink mt-1">{formatCurrency(totalToReceive)}</p>
        </div>
        <div className="bg-white border border-border rounded p-5">
          <p className="text-sm text-ink-muted">Recebido (parcelas pagas)</p>
          <p className="font-display text-2xl text-primary-dark mt-1">{formatCurrency(totalReceivedThisMonth)}</p>
        </div>
        <div className="bg-white border border-border rounded p-5">
          <p className="text-sm text-ink-muted">A pagar</p>
          <p className="font-display text-2xl text-alert mt-1">{formatCurrency(totalToPay)}</p>
        </div>
      </div>

      <div className="border-b border-border flex gap-6 text-sm mb-6">
        <button
          onClick={() => setTab("receivables")}
          className={`pb-2 border-b-2 ${tab === "receivables" ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted"}`}
        >
          Contas a receber
        </button>
        <button
          onClick={() => setTab("payables")}
          className={`pb-2 border-b-2 ${tab === "payables" ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted"}`}
        >
          Contas a pagar
        </button>
      </div>

      {loading && <p className="text-sm text-ink-muted">Carregando...</p>}

      {!loading && tab === "receivables" && (
        <div className="bg-white border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-ink-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {receivables.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted">Nenhuma conta a receber ainda.</td></tr>
              )}
              {receivables.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/patients/${r.patient.id}/orcamentos`} className="text-primary hover:underline font-medium">
                      {r.patient.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{r.description}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatCurrency(r.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-ink-muted bg-surface px-2 py-1 rounded">
                      {RECEIVABLE_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "payables" && <PayablesTable payables={payables} onChanged={load} />}
    </div>
  );
}

function PayablesTable({ payables, onChanged }: { payables: Payable[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", category: "", amount: "", dueDate: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/financial/payables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        category: form.category || null,
        amount: parseFloat(form.amount.replace(",", ".")),
        dueDate: new Date(form.dueDate).toISOString(),
      }),
    });
    setSaving(false);
    setForm({ description: "", category: "", amount: "", dueDate: "" });
    setShowForm(false);
    onChanged();
  }

  async function markPaid(id: string) {
    await fetch(`/api/financial/payables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    onChanged();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Nova conta a pagar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs text-ink-muted mb-1">Descrição</label>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Valor (R$)</label>
            <input required inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full rounded border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Vencimento</label>
            <input required type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full rounded border border-border px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-4">
            <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {payables.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">Nenhuma conta a pagar ainda.</td></tr>
            )}
            {payables.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 text-ink">{p.description}</td>
                <td className="px-4 py-3 text-ink-muted">{new Date(p.dueDate).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-ink-muted">{formatCurrency(p.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${p.status === "paid" ? "bg-primary-light/15 text-primary-dark" : "bg-surface text-ink-muted"}`}>
                    {p.status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status !== "paid" && (
                    <button onClick={() => markPaid(p.id)} className="text-xs text-primary hover:text-primary-dark border border-border rounded px-2 py-1">
                      Marcar como pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

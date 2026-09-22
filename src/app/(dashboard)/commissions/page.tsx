"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

type Entry = {
  id: string;
  amount: number;
  percentageApplied: number;
  createdAt: string;
  professionalUserId: string;
  professionalName: string;
  patientName: string;
  procedureName: string;
};

type Rule = {
  id: string;
  professionalUserId: string;
  professionalName: string;
  procedureId: string | null;
  procedure: { id: string; name: string } | null;
  percentage: number;
};

type Professional = { id: string; name: string };
type Procedure = { id: string; name: string };

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

export default function CommissionsPage() {
  const [canManage, setCanManage] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [tab, setTab] = useState<"extrato" | "regras">("extrato");

  useEffect(() => {
    fetch("/api/me/permissions")
      .then((r) => r.json())
      .then((data) => {
        setCanManage((data.permissions ?? []).includes("commissions:write"));
        setPermissionsLoaded(true);
      });
  }, []);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-2xl text-ink mb-1">Comissões</h1>
      <p className="text-sm text-ink-muted mb-6">
        {canManage ? "Extrato de todos os profissionais e configuração de regras" : "Seu extrato de comissões"}
      </p>

      {permissionsLoaded && canManage && (
        <div className="border-b border-border flex gap-6 text-sm mb-6">
          <button
            onClick={() => setTab("extrato")}
            className={`pb-2 border-b-2 ${tab === "extrato" ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted"}`}
          >
            Extrato
          </button>
          <button
            onClick={() => setTab("regras")}
            className={`pb-2 border-b-2 ${tab === "regras" ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted"}`}
          >
            Configurar regras
          </button>
        </div>
      )}

      {permissionsLoaded && tab === "extrato" && <ExtractSection canManage={canManage} />}
      {permissionsLoaded && tab === "regras" && canManage && <RulesSection />}
    </div>
  );
}

function ExtractSection({ canManage }: { canManage: boolean }) {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [professionalFilter, setProfessionalFilter] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  useEffect(() => {
    if (canManage) {
      fetch("/api/professionals").then((r) => r.ok && r.json()).then((d) => d && setProfessionals(d.professionals));
    }
  }, [canManage]);

  useEffect(() => {
    load();
  }, [from, to, professionalFilter]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
    });
    if (professionalFilter) params.set("professionalUserId", professionalFilter);
    const res = await fetch(`/api/commission-entries?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        </div>
        {canManage && (
          <div className="sm:w-56">
            <label className="block text-xs text-ink-muted mb-1">Profissional</label>
            <select
              value={professionalFilter}
              onChange={(e) => setProfessionalFilter(e.target.value)}
              className="w-full rounded border border-border px-3 py-2 text-sm bg-white"
            >
              <option value="">Todos os profissionais</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white border border-border rounded p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary/60" strokeWidth={1.75} />
          <p className="text-sm text-ink-muted">Total no período</p>
        </div>
        <p className="font-display text-2xl text-ink" style={{ fontWeight: 600 }}>{formatCurrency(total)}</p>
      </div>

      <div className="bg-white border border-border rounded overflow-hidden">
        {loading && <p className="px-4 py-8 text-center text-sm text-ink-muted">Carregando...</p>}
        {!loading && entries.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Nenhuma comissão no período selecionado.</p>
        )}
        {!loading && entries.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-surface text-ink-muted text-left">
              <tr>
                {canManage && <th className="px-4 py-2 font-medium">Profissional</th>}
                <th className="px-4 py-2 font-medium">Paciente</th>
                <th className="px-4 py-2 font-medium">Procedimento</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium text-right">%</th>
                <th className="px-4 py-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  {canManage && <td className="px-4 py-2 text-ink">{e.professionalName}</td>}
                  <td className="px-4 py-2 text-ink-muted">{e.patientName}</td>
                  <td className="px-4 py-2 text-ink-muted">{e.procedureName}</td>
                  <td className="px-4 py-2 text-ink-muted">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right text-ink-muted">{e.percentageApplied}%</td>
                  <td className="px-4 py-2 text-right text-ink font-medium">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RulesSection() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ professionalUserId: "", procedureId: "", percentage: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    fetch("/api/professionals").then((r) => r.ok && r.json()).then((d) => d && setProfessionals(d.professionals));
    fetch("/api/procedures").then((r) => r.ok && r.json()).then((d) => d && setProcedures(d.procedures));
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/commission-rules");
    if (res.ok) setRules((await res.json()).rules);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/commission-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalUserId: form.professionalUserId,
        procedureId: form.procedureId || null,
        percentage: parseFloat(form.percentage.replace(",", ".")),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar regra.");
      return;
    }
    setForm({ professionalUserId: "", procedureId: "", percentage: "" });
    setShowForm(false);
    load();
  }

  async function removeRule(id: string) {
    await fetch(`/api/commission-rules/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Regras de comissão</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Regra específica por procedimento tem prioridade sobre a regra geral do profissional
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Nova regra
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          {error && (
            <div className="sm:col-span-4 text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-xs text-ink-muted mb-1">Profissional</label>
            <select
              required
              value={form.professionalUserId}
              onChange={(e) => setForm((f) => ({ ...f, professionalUserId: e.target.value }))}
              className="w-full rounded border border-border px-2 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Procedimento</label>
            <select
              value={form.procedureId}
              onChange={(e) => setForm((f) => ({ ...f, procedureId: e.target.value }))}
              className="w-full rounded border border-border px-2 py-2 text-sm"
            >
              <option value="">Regra geral (todos)</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-muted mb-1">Percentual (%)</label>
            <input
              required
              inputMode="decimal"
              placeholder="Ex: 30"
              value={form.percentage}
              onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))}
              className="w-full rounded border border-border px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      <div className="bg-white border border-border rounded overflow-hidden">
        {loading && <p className="px-4 py-8 text-center text-sm text-ink-muted">Carregando...</p>}
        {!loading && rules.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Nenhuma regra cadastrada ainda.</p>
        )}
        {!loading && rules.length > 0 && (
          <ul className="divide-y divide-border">
            {rules.map((rule) => (
              <li key={rule.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink font-medium">{rule.professionalName}</p>
                  <p className="text-xs text-ink-muted">
                    {rule.procedure ? rule.procedure.name : "Regra geral (todos os procedimentos)"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-primary">{rule.percentage}%</span>
                  <button onClick={() => removeRule(rule.id)} className="text-ink-muted hover:text-alert">
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

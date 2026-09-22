"use client";

import { useEffect, useState } from "react";
import { Plus, Armchair, DoorOpen, UserPlus } from "lucide-react";

type Resource = { id: string; name: string; type: string; active: boolean };
type Role = { id: string; name: string };
type TeamUser = { id: string; name: string; email: string; active: boolean; role: { id: string; name: string } };

export default function SettingsPage() {
  const [tab, setTab] = useState<"resources" | "users" | null>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/me/permissions")
      .then((r) => r.json())
      .then((data) => {
        const perms: string[] = data.permissions ?? [];
        setPermissions(perms);
        if (perms.includes("agenda:write")) setTab("resources");
        else if (perms.includes("users:manage")) setTab("users");
      });
  }, []);

  const canSeeResources = permissions?.includes("agenda:write") ?? false;
  const canSeeUsers = permissions?.includes("users:manage") ?? false;

  if (permissions && !canSeeResources && !canSeeUsers) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="font-display text-2xl text-ink mb-1">Configurações</h1>
        <p className="text-sm text-ink-muted">
          Seu papel não tem acesso a nenhuma seção de configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="font-display text-2xl text-ink mb-1">Configurações</h1>
      <p className="text-sm text-ink-muted mb-6">Ajustes gerais da clínica</p>

      <div className="border-b border-border flex gap-6 text-sm mb-6">
        {canSeeResources && (
          <button
            onClick={() => setTab("resources")}
            className={`pb-2 border-b-2 ${tab === "resources" ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted"}`}
          >
            Salas e cadeiras
          </button>
        )}
        {canSeeUsers && (
          <button
            onClick={() => setTab("users")}
            className={`pb-2 border-b-2 ${tab === "users" ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted"}`}
          >
            Usuários
          </button>
        )}
      </div>

      {tab === "resources" && <ResourcesSection />}
      {tab === "users" && <UsersSection />}
      {tab === null && permissions && <p className="text-sm text-ink-muted">Carregando...</p>}
    </div>
  );
}

function ResourcesSection() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "cadeira" as "cadeira" | "sala" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/clinical-resources?includeInactive=1");
    if (res.ok) setResources((await res.json()).resources);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/clinical-resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm({ name: "", type: "cadeira" });
    setShowForm(false);
    load();
  }

  async function toggleActive(resource: Resource) {
    await fetch(`/api/clinical-resources/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !resource.active }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Salas e cadeiras</h2>
          <p className="text-xs text-ink-muted mt-0.5">Usadas para marcar consultas na Agenda</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} />
          Nova sala/cadeira
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 mb-4 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs text-ink-muted mb-1">Nome</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Cadeira 1, Sala de raio-X"
              className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-ink-muted mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "cadeira" | "sala" }))}
              className="w-full rounded border border-border px-3 py-2 text-sm"
            >
              <option value="cadeira">Cadeira</option>
              <option value="sala">Sala</option>
            </select>
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
        {!loading && resources.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            Nenhuma sala/cadeira cadastrada ainda. Cadastre pelo menos uma para conseguir usar a Agenda.
          </p>
        )}
        <ul className="divide-y divide-border">
          {resources.map((r) => (
            <li key={r.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {r.type === "sala" ? (
                  <DoorOpen size={16} className="text-ink-muted" strokeWidth={1.75} />
                ) : (
                  <Armchair size={16} className="text-ink-muted" strokeWidth={1.75} />
                )}
                <span className={`text-sm ${r.active ? "text-ink" : "text-ink-muted/50 line-through"}`}>
                  {r.name}
                </span>
              </div>
              <button
                onClick={() => toggleActive(r)}
                className="text-xs text-ink-muted hover:text-ink border border-border rounded px-2 py-1"
              >
                {r.active ? "Desativar" : "Reativar"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [usersRes, rolesRes] = await Promise.all([fetch("/api/users"), fetch("/api/roles")]);
    if (usersRes.ok) setUsers((await usersRes.json()).users);
    if (rolesRes.ok) setRoles((await rolesRes.json()).roles);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao cadastrar usuário.");
      return;
    }
    setForm({ name: "", email: "", password: "", roleId: "" });
    setShowForm(false);
    load();
  }

  async function toggleActive(u: TeamUser) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (res.ok) load();
  }

  async function changeRole(u: TeamUser, roleId: string) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Usuários da clínica</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Dentistas, recepcionistas e demais pessoas com acesso ao sistema
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <UserPlus size={15} />
          Novo usuário
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-5 mb-4 space-y-4">
          {error && <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-muted mb-1">Nome</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">E-mail</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Senha provisória</label>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Papel</label>
              <select
                required
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Cadastrando..." : "Cadastrar usuário"}
          </button>
        </form>
      )}

      <div className="bg-white border border-border rounded overflow-hidden">
        {loading && <p className="px-4 py-8 text-center text-sm text-ink-muted">Carregando...</p>}
        {!loading && users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">Nenhum usuário cadastrado ainda.</p>
        )}
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm ${u.active ? "text-ink" : "text-ink-muted/50 line-through"} truncate`}>
                  {u.name}
                </p>
                <p className="text-xs text-ink-muted truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={u.role.id}
                  onChange={(e) => changeRole(u, e.target.value)}
                  className="text-xs border border-border rounded px-1.5 py-1 bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => toggleActive(u)}
                  className="text-xs text-ink-muted hover:text-ink border border-border rounded px-2 py-1"
                >
                  {u.active ? "Desativar" : "Reativar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  birthDate: string | null;
};

export default function PatientsListPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPatients(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function fetchPatients(q: string) {
    setLoading(true);
    const res = await fetch(`/api/patients?search=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setPatients(data.patients);
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">Pacientes</h1>
        <Link
          href="/patients/new"
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded px-4 py-2 transition-colors"
        >
          <Plus size={15} strokeWidth={2} />
          Novo paciente
        </Link>
      </div>

      <div className="relative max-w-md mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-border pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
        />
      </div>

      <div className="bg-white border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-ink-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CPF</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            )}
            {!loading &&
              patients.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link href={`/patients/${p.id}`} className="text-primary hover:underline font-medium">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.document ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.whatsapp ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

type Entry = {
  id: string;
  type: string;
  content: string;
  authorUserId: string;
  createdAt: string;
};

type MedicalRecord = {
  id: string;
  anamnesis: string | null;
  allergies: string | null;
  medications: string | null;
  entries: Entry[];
};

const TYPE_LABELS: Record<string, string> = {
  evolucao: "Evolução",
  diagnostico: "Diagnóstico",
  plano_tratamento: "Plano de tratamento",
  procedimento_realizado: "Procedimento realizado",
  anexo: "Anexo",
};

export default function ProntuarioPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingHeader, setSavingHeader] = useState(false);

  const [header, setHeader] = useState({ anamnesis: "", allergies: "", medications: "" });
  const [newEntry, setNewEntry] = useState({ type: "evolucao", content: "" });
  const [addingEntry, setAddingEntry] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/patients/${id}/medical-record`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error ?? `Erro ao carregar prontuário (status ${res.status}).`);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRecord(data.medicalRecord);
      setHeader({
        anamnesis: data.medicalRecord.anamnesis ?? "",
        allergies: data.medicalRecord.allergies ?? "",
        medications: data.medicalRecord.medications ?? "",
      });
    } catch (err) {
      setLoadError("Não foi possível conectar ao servidor.");
    }
    setLoading(false);
  }

  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerSaved, setHeaderSaved] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  async function saveHeader() {
    setSavingHeader(true);
    setHeaderError(null);
    setHeaderSaved(false);
    try {
      const res = await fetch(`/api/patients/${id}/medical-record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(header),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setHeaderError(data.error ?? `Erro ao salvar (status ${res.status}).`);
      } else {
        setHeaderSaved(true);
        setTimeout(() => setHeaderSaved(false), 3000);
      }
    } catch {
      setHeaderError("Não foi possível conectar ao servidor.");
    }
    setSavingHeader(false);
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newEntry.content.trim()) return;
    setAddingEntry(true);
    setEntryError(null);
    try {
      const res = await fetch(`/api/patients/${id}/medical-record/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEntryError(data.error ?? `Erro ao adicionar entrada (status ${res.status}).`);
        setAddingEntry(false);
        return;
      }
      setNewEntry({ type: "evolucao", content: "" });
      load();
    } catch {
      setEntryError("Não foi possível conectar ao servidor.");
    }
    setAddingEntry(false);
  }

  if (loading) return <div className="p-8 text-ink-muted/70 text-sm">Carregando prontuário...</div>;
  if (loadError) {
    return (
      <div className="p-8">
        <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-4 py-3 max-w-lg">
          Não foi possível carregar o prontuário: {loadError}
        </div>
      </div>
    );
  }
  if (!record) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a
          href={`/print/prontuario/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark border border-border rounded px-3 py-1.5"
        >
          <Printer size={14} />
          Imprimir prontuário
        </a>
      </div>

      <div className="bg-white border border-border rounded p-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Anamnese e alergias</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Anamnese</label>
            <textarea
              value={header.anamnesis}
              onChange={(e) => setHeader((h) => ({ ...h, anamnesis: e.target.value }))}
              rows={3}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Alergias</label>
            <textarea
              value={header.allergies}
              onChange={(e) => setHeader((h) => ({ ...h, allergies: e.target.value }))}
              rows={2}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Medicações em uso</label>
            <textarea
              value={header.medications}
              onChange={(e) => setHeader((h) => ({ ...h, medications: e.target.value }))}
              rows={2}
              className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {headerError && (
            <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">
              {headerError}
            </div>
          )}
          {headerSaved && (
            <div className="text-sm text-primary-dark bg-primary-light/10 border border-primary-light/30 rounded px-3 py-2">
              Salvo com sucesso.
            </div>
          )}
          <button
            onClick={saveHeader}
            disabled={savingHeader}
            className="self-start bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {savingHeader ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded p-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Nova entrada no histórico</h2>
        <p className="text-xs text-ink-muted/70 mb-3">
          Entradas de histórico não podem ser editadas ou apagadas depois de criadas.
        </p>
        <form onSubmit={addEntry} className="space-y-3">
          {entryError && (
            <div className="text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2">
              {entryError}
            </div>
          )}
          <select
            value={newEntry.type}
            onChange={(e) => setNewEntry((n) => ({ ...n, type: e.target.value }))}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            required
            value={newEntry.content}
            onChange={(e) => setNewEntry((n) => ({ ...n, content: e.target.value }))}
            rows={3}
            placeholder="Descreva a evolução, diagnóstico ou procedimento..."
            className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={addingEntry}
            className="bg-primary hover:bg-primary-dark text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {addingEntry ? "Adicionando..." : "Adicionar ao histórico"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-border rounded p-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Histórico</h2>
        {record.entries.length === 0 && (
          <p className="text-sm text-ink-muted/70">Nenhuma entrada registrada ainda.</p>
        )}
        <div className="space-y-4">
          {record.entries.map((entry) => (
            <div key={entry.id} className="border-l-2 border-primary pl-4">
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="font-medium text-primary">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                <span>·</span>
                <span>{new Date(entry.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{entry.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

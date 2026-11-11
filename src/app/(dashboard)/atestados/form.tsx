"use client";

import { useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

type Patient = { id: string; name: string; document: string | null };

export default function CertificatesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState("1");
  const [text, setText] = useState("Atesto, para os devidos fins, que o(a) paciente acima identificado(a) necessita de afastamento de suas atividades.");
  useEffect(() => { fetch("/api/patients").then((r) => r.ok ? r.json() : { patients: [] }).then((d) => setPatients(d.patients ?? [])); }, []);
  const patient = patients.find((p) => p.id === patientId);
  const dateLabel = issuedAt ? new Date(`${issuedAt}T12:00:00`).toLocaleDateString("pt-BR") : "";
  return <div className="p-4 sm:p-8 max-w-5xl">
    <div className="print:hidden"><h1 className="font-display text-2xl text-ink">Atestados médicos</h1><p className="text-sm text-ink-muted mt-1 mb-6">Preencha os dados e imprima ou salve como PDF em papel A4.</p>
      <div className="bg-white border border-border rounded p-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-ink">Paciente<select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2"><option value="">Selecione um paciente</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="text-sm text-ink">Data de emissão<input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" /></label>
        <label className="text-sm text-ink">Período de afastamento (dias)<input type="number" min="0" value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" /></label>
        <label className="text-sm text-ink sm:col-span-2">Texto do atestado<textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full rounded border border-border px-3 py-2" /></label>
        <div className="sm:col-span-2 flex justify-end"><button disabled={!patient} onClick={() => window.print()} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Imprimir / Salvar PDF</button></div>
      </div>
    </div>
    <article className="certificate-sheet mx-auto mt-8 bg-white p-12 text-ink shadow-sm print:mt-0 print:shadow-none">
      <header className="text-center"><p className="text-sm font-semibold tracking-widest">{BRAND_NAME} · CLÍNICA MÉDICA</p><h2 className="mt-16 text-xl font-bold tracking-wide">ATESTADO MÉDICO</h2></header>
      <p className="mt-16 text-base leading-8">{text}</p><p className="mt-5 text-base">Paciente: <strong>{patient?.name ?? "________________________________"}</strong></p>{patient?.document && <p className="text-sm text-ink-muted">Documento: {patient.document}</p>}
      <p className="mt-3 text-base">Período de afastamento: <strong>{days || "___"} {Number(days) === 1 ? "dia" : "dias"}</strong>.</p><p className="mt-16 text-base text-right">__________________, {dateLabel || "____/____/________"}</p>
      <div className="mt-24 ml-auto w-72 border-t border-ink pt-2 text-center text-sm">Médico(a) responsável · CRM: __________________</div>
    </article>
    <style jsx global>{`@media print { @page { size: A4; margin: 0; } body { background: white !important; } body * { visibility: hidden !important; } .certificate-sheet, .certificate-sheet * { visibility: visible !important; } .certificate-sheet { position: fixed; inset: 0; width: 210mm; height: 297mm; margin: 0 !important; padding: 25mm !important; } }`}</style>
  </div>;
}

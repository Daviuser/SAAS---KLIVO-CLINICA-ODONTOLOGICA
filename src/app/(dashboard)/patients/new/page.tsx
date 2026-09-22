"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initialForm = {
  name: "",
  document: "",
  birthDate: "",
  phone: "",
  whatsapp: "",
  email: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressCity: "",
  addressState: "",
  addressZipCode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
};

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar paciente.");
      return;
    }

    const { patient } = await res.json();
    router.push(`/patients/${patient.id}`);
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink mb-6">Novo paciente</h1>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded p-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Dados pessoais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo *" value={form.name} onChange={(v) => update("name", v)} required className="sm:col-span-2" />
            <Field label="CPF" value={form.document} onChange={(v) => update("document", v)} />
            <Field label="Data de nascimento" type="date" value={form.birthDate} onChange={(v) => update("birthDate", v)} />
            <Field label="Telefone" value={form.phone} onChange={(v) => update("phone", v)} />
            <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => update("whatsapp", v)} />
            <Field label="E-mail" type="email" value={form.email} onChange={(v) => update("email", v)} className="sm:col-span-2" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Endereço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Rua" value={form.addressStreet} onChange={(v) => update("addressStreet", v)} />
            <Field label="Número" value={form.addressNumber} onChange={(v) => update("addressNumber", v)} />
            <Field label="Complemento" value={form.addressComplement} onChange={(v) => update("addressComplement", v)} />
            <Field label="CEP" value={form.addressZipCode} onChange={(v) => update("addressZipCode", v)} />
            <Field label="Cidade" value={form.addressCity} onChange={(v) => update("addressCity", v)} />
            <Field label="Estado" value={form.addressState} onChange={(v) => update("addressState", v)} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Contato de emergência</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome" value={form.emergencyContactName} onChange={(v) => update("emergencyContactName", v)} />
            <Field label="Telefone" value={form.emergencyContactPhone} onChange={(v) => update("emergencyContactPhone", v)} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Observações</h2>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </section>

        <button
          type="submit"
          disabled={loading}
          className="bg-primary hover:bg-primary-dark text-white rounded px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar paciente"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

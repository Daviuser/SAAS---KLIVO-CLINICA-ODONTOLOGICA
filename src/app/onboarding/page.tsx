"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, AlertCircle } from "lucide-react";
import { LoginVisual } from "@/components/auth/LoginVisual";
import { Logo } from "@/components/brand/Logo";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clinicName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao criar a clínica.");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email: form.adminEmail,
      password: form.adminPassword,
      redirect: false,
    });

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="h-40 lg:h-auto lg:w-1/2">
        <LoginVisual />
      </div>

      <div className="flex-1 flex items-center justify-center bg-surface px-6 py-10 relative overflow-hidden">
        <div className="hidden lg:block absolute -bottom-28 -right-20 w-80 h-80 rounded-full border border-primary/10" />

        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white border border-border rounded-lg shadow-[0_1px_3px_rgba(20,35,31,0.06),0_8px_24px_rgba(20,35,31,0.06)] p-8 relative animate-fade-in-up [animation-delay:80ms]"
        >
          <div className="flex justify-center mb-7">
            <Logo size={40} />
          </div>

          <h1 className="font-display text-2xl text-ink mb-1 text-center" style={{ fontWeight: 700 }}>
            Cadastre sua clínica
          </h1>
          <p className="text-sm text-ink-muted mb-8 text-center">
            Crie o ambiente da sua clínica e o primeiro usuário administrador
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-2 text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-5">
            <Field label="Nome da clínica" value={form.clinicName} onChange={(v) => update("clinicName", v)} />
            <Field label="Seu nome" value={form.adminName} onChange={(v) => update("adminName", v)} />
            <Field label="Seu e-mail" type="email" value={form.adminEmail} onChange={(v) => update("adminEmail", v)} />
            <Field label="Senha" type="password" minLength={8} value={form.adminPassword} onChange={(v) => update("adminPassword", v)} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-7 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark active:scale-[0.99] text-white rounded py-2.5 text-sm font-medium transition-all disabled:opacity-70"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Criando..." : "Criar clínica"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      <input
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
      />
    </div>
  );
}

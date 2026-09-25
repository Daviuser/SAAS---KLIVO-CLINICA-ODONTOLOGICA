"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { LoginVisual } from "@/components/auth/LoginVisual";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface">
      {/* Banner no mobile / painel visual completo no desktop */}
      <div className="hidden lg:block lg:w-1/2">
        <LoginVisual />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:py-6 relative overflow-hidden">
        {/* Círculos decorativos do painel claro */}
        <div className="hidden lg:block absolute -bottom-28 -right-20 w-80 h-80 rounded-full border border-primary/10" />
        <div className="hidden lg:block absolute -bottom-40 -right-32 w-96 h-96 rounded-full border border-primary/10" />

        <p className="hidden lg:flex items-center gap-2 text-xs tracking-[0.15em] text-ink-muted mb-8 relative">
          <span className="w-6 h-px bg-ink-muted/40" />
          SUA CLÍNICA, MAIS ORGANIZADA
        </p>

        <div className="w-full max-w-sm bg-white border border-border rounded-lg shadow-[0_1px_3px_rgba(20,35,31,0.06),0_8px_24px_rgba(20,35,31,0.06)] p-8 relative animate-fade-in-up [animation-delay:80ms]">
          <div className="flex justify-center mb-7">
            <Logo size={40} />
          </div>

          <h1 className="font-display text-2xl text-ink mb-1 text-center" style={{ fontWeight: 700 }}>
            Entrar
          </h1>
          <p className="text-sm text-ink-muted mb-7 text-center">
            Acesse o sistema de gestão da sua clínica
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-2 text-sm text-alert bg-alert/5 border border-alert/20 rounded px-3 py-2.5 animate-fade-in-up">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-ink mb-1.5">E-mail</label>
            <div className="relative mb-5">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="email"
                required
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-border pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-ink-muted/50"
              />
            </div>

            <label className="block text-sm font-medium text-ink mb-1.5">Senha</label>
            <div className="relative mb-3">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-border pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors placeholder:text-ink-muted/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between mb-7">
              <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Lembrar de mim
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark">
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark active:scale-[0.99] text-white rounded py-2.5 text-sm font-semibold transition-all disabled:opacity-70"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="border-t border-border mt-7 pt-5 flex items-center justify-center gap-2">
            <ShieldCheck size={15} className="text-ink-muted/60" strokeWidth={1.75} />
            <div className="text-center">
              <p className="text-xs text-ink-muted leading-tight">Ambiente seguro</p>
              <p className="text-[11px] text-ink-muted/60 leading-tight">Seus dados estão protegidos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

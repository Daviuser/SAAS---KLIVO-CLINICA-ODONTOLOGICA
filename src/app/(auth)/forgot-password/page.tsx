import Link from "next/link";
import { LoginVisual } from "@/components/auth/LoginVisual";
import { Logo } from "@/components/brand/Logo";

// Esta tela ainda é só a interface — o fluxo de recuperação de senha
// (envio de e-mail com token, expiração, troca de senha) não está
// implementado no backend. Fica marcado como próximo passo de segurança.
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface">
      <div className="hidden lg:block lg:w-1/2">
        <LoginVisual />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 relative overflow-hidden">
        <div className="hidden lg:block absolute -bottom-28 -right-20 w-80 h-80 rounded-full border border-primary/10" />

        <div className="w-full max-w-sm bg-white border border-border rounded-lg shadow-[0_1px_3px_rgba(20,35,31,0.06),0_8px_24px_rgba(20,35,31,0.06)] p-8 relative animate-fade-in-up">
          <div className="flex justify-center mb-7">
            <Logo size={40} />
          </div>

          <h1 className="font-display text-2xl text-ink mb-1 text-center" style={{ fontWeight: 700 }}>
            Recuperar senha
          </h1>
          <p className="text-sm text-ink-muted mb-6 text-center">
            Por enquanto, a recuperação automática por e-mail ainda não está
            disponível. Entre em contato com o administrador da sua clínica
            para redefinir sua senha.
          </p>

          <Link
            href="/login"
            className="flex justify-center text-sm text-primary hover:text-primary-dark"
          >
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}

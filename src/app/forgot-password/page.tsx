import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

// NOTA PARA O TIME: recuperação de senha por e-mail depende de um
// provedor de envio (Resend, SES etc.) que ainda não foi configurado.
// Por enquanto, esta tela só orienta o usuário — não promete um fluxo
// que o backend ainda não tem. Quando o provedor de e-mail for definido,
// eu implemento o fluxo real (token de reset + formulário de nova senha).
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm bg-white border border-border rounded p-8">
        <p className="font-display text-lg text-ink mb-6">{BRAND_NAME}</p>

        <h1 className="font-display text-xl text-ink mb-2">Esqueceu sua senha?</h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          A recuperação automática por e-mail ainda não está disponível. Por
          enquanto, entre em contato com o administrador da sua clínica para
          redefinir sua senha.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark mt-6"
        >
          <ArrowLeft size={15} />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}

import { BRAND_NAME } from "@/lib/brand";
import { Stethoscope } from "lucide-react";
import Image from "next/image";

// Ícone médico usado nos pontos compactos da interface. O nome exportado
// é mantido para compatibilidade com as páginas originais do projeto.
export function ToothIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <Stethoscope aria-label="CAF Vida Santaluz" size={size} className={className} strokeWidth={1.7} />
  );
}

export function Logo({
  size = 36,
  showTagline = true,
  light = false,
  className = "",
}: {
  size?: number;
  showTagline?: boolean;
  light?: boolean;
  className?: string;
}) {
  // Nome e tagline escalam proporcionalmente ao tamanho do ícone, em vez
  // de ficarem com tamanho fixo — assim, pedir uma logo maior aumenta
  // tudo junto (ícone, nome e tagline) de forma consistente.
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src="/brand/caf-vida-santaluz.jpeg"
        alt={BRAND_NAME}
        width={440}
        height={511}
        priority
        className="h-auto w-full max-w-[190px] object-contain"
        style={{ maxWidth: `${Math.min(190, size * 3.5)}px` }}
      />
      {showTagline && (
        <p className={`mt-1 text-center text-xs ${light ? "text-white/70" : "text-ink-muted"}`}>
          Centro de Apoio à Família
        </p>
      )}
    </div>
  );
}

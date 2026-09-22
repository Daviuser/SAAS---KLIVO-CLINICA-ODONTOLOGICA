import { BRAND_NAME } from "@/lib/brand";

// Ícone de dente estilizado (SVG próprio, sem depender de biblioteca de
// ícones — o lucide-react não tem um ícone de dente).
export function ToothIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5c-2.5 0-4.5 1.7-4.5 4.3 0 1.6.7 2.4.9 4 .3 2.2-.4 3.9-.4 5.8 0 1.4.7 2.4 1.7 2.4.9 0 1.1-1.5 1.4-2.8.2-1 .5-1.7.9-1.7s.7.7.9 1.7c.3 1.3.5 2.8 1.4 2.8 1 0 1.7-1 1.7-2.4 0-1.9-.7-3.6-.4-5.8.2-1.6.9-2.4.9-4 0-2.6-2-4.3-4.5-4.3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
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
  const nameSize = Math.round(size * 0.62);
  const taglineSize = Math.round(size * 0.28);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ToothIcon size={size} className={light ? "text-primary-light" : "text-primary"} />
      <div>
        <p
          className="font-display leading-none"
          style={{ fontWeight: 700, fontSize: `${nameSize}px` }}
        >
          {BRAND_NAME}
        </p>
        {showTagline && (
          <p
            className={`mt-1 ${light ? "text-white/60" : "text-ink-muted"}`}
            style={{ fontSize: `${taglineSize}px` }}
          >
            Gestão de Clínicas Odontológicas
          </p>
        )}
      </div>
    </div>
  );
}

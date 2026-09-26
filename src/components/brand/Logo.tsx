import { BRAND_NAME } from "@/lib/brand";

// Símbolo oficial da marca Klivo (imagem única, com transparência),
// centralizado aqui e reaproveitado em todos os componentes que exibem
// a marca — login, sidebar, telas internas e impressões. Mantém o mesmo
// nome/assinatura (`ToothIcon`) do ícone SVG anterior para não exigir
// mudanças nos locais que já o utilizam.
export function ToothIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/klivo-tooth.png"
      alt="Klivo"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
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

import { getToothImagePath, getToothType } from "@/lib/dental";

export type ToothCondition = "higido" | "cariado" | "restaurado" | "ausente" | "implante";

// Região aproximada da coroa (em % da imagem) por tipo de dente — usada para
// posicionar os indicadores de cárie/restauração sobre a foto real. Baseada
// na proporção anatômica típica coroa:raiz (coroas de anteriores ~40% do
// comprimento total do dente; molares, um pouco menos, pois têm raízes
// proporcionalmente mais longas).
const CROWN_REGION: Record<
  "incisivo" | "canino" | "premolar" | "molar",
  { top: number; left: number; width: number; height: number }
> = {
  incisivo: { top: 4, left: 20, width: 60, height: 34 },
  canino: { top: 3, left: 18, width: 64, height: 36 },
  premolar: { top: 3, left: 12, width: 76, height: 34 },
  molar: { top: 2, left: 8, width: 84, height: 32 },
};

export function ToothIcon({
  fdi,
  condition,
  selected = false,
  className = "",
}: {
  fdi: string;
  condition: ToothCondition;
  selected?: boolean;
  className?: string;
}) {
  const type = getToothType(fdi);
  const src = getToothImagePath(fdi);
  const crown = CROWN_REGION[type];

  const isMissing = condition === "ausente";
  const isImplant = condition === "implante";
  const isDecay = condition === "cariado";
  const isRestored = condition === "restaurado";

  const imgFilters: string[] = [];
  if (isMissing) imgFilters.push("grayscale(1)", "brightness(1.8)", "opacity(0.16)");
  if (selected) imgFilters.push("drop-shadow(0 0 2px #0E6B5C)", "drop-shadow(0 0 4px rgba(14,107,92,0.65))");

  return (
    <div className={`relative ${className}`}>
      {/* Realce de seleção — atrás da foto, não altera o dente em si */}
      {selected && <div className="absolute inset-[6%] rounded-2xl bg-primary/10" />}

      {/* Dente ausente: contorno tracejado marcando o espaço vazio */}
      {isMissing && (
        <div className="absolute inset-[4%] rounded-xl border-2 border-dashed border-[rgba(91,107,103,0.35)]" />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Dente ${fdi}`}
        draggable={false}
        className="relative w-full h-full object-contain select-none pointer-events-none"
        style={imgFilters.length ? { filter: imgFilters.join(" ") } : undefined}
      />

      {!isMissing && isDecay && (
        <div
          className="absolute rounded-[45%] bg-[#3b2418]"
          style={{
            top: `${crown.top + crown.height * 0.25}%`,
            left: `${crown.left + crown.width * 0.42}%`,
            width: `${crown.width * 0.3}%`,
            height: `${crown.height * 0.42}%`,
            opacity: 0.88,
            transform: "rotate(-8deg)",
          }}
        />
      )}

      {!isMissing && isRestored && (
        <div
          className="absolute rounded-[40%] border border-[rgba(124,134,143,0.5)]"
          style={{
            top: `${crown.top + crown.height * 0.2}%`,
            left: `${crown.left + crown.width * 0.12}%`,
            width: `${crown.width * 0.34}%`,
            height: `${crown.height * 0.46}%`,
            background: "linear-gradient(135deg, #eef1f3, #9aa4ad)",
            opacity: 0.92,
          }}
        />
      )}

      {!isMissing && isImplant && (
        <div
          className="absolute flex items-center justify-center rounded-full text-white font-bold border border-[#55595d]"
          style={{
            bottom: "6%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "24%",
            aspectRatio: "1",
            fontSize: "7px",
            background: "linear-gradient(135deg, #d4d9dd, #6f767c)",
          }}
          title="Implante"
        >
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 3v6M12 21v-6M8 9h8l-1.5 3H9.5L8 9Z" strokeLinejoin="round" />
            <path d="M9.5 12 L14.5 12 L13.5 15 L10.5 15 Z" />
          </svg>
        </div>
      )}

      {isMissing && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          <g strokeLinecap="round">
            {/* contorno branco por trás, pra garantir contraste em qualquer fundo */}
            <line x1="25" y1="20" x2="75" y2="80" stroke="white" strokeWidth="11" />
            <line x1="75" y1="20" x2="25" y2="80" stroke="white" strokeWidth="11" />
            <line x1="25" y1="20" x2="75" y2="80" stroke="#dc2626" strokeWidth="7" />
            <line x1="75" y1="20" x2="25" y2="80" stroke="#dc2626" strokeWidth="7" />
          </g>
        </svg>
      )}
    </div>
  );
}

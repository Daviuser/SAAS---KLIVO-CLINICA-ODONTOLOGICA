// Helpers de anatomia odontológica a partir da numeração FDI (dois dígitos:
// quadrante + posição). Usado para escolher o formato ilustrativo correto
// de cada dente no odontograma (incisivo, canino, pré-molar ou molar) e
// para saber se ele pertence à arcada superior ou inferior.

export type ToothType = "incisivo" | "canino" | "premolar" | "molar";
export type Arch = "superior" | "inferior";

export function getToothType(fdi: string): ToothType {
  const position = Number(fdi[1]);
  if (position <= 2) return "incisivo";
  if (position === 3) return "canino";
  if (position <= 5) return "premolar";
  return "molar";
}

export function getArch(fdi: string): Arch {
  const quadrant = Number(fdi[0]);
  return quadrant === 1 || quadrant === 2 ? "superior" : "inferior";
}

// Nome do arquivo (em /public/teeth) da foto do dente correspondente a
// cada posição FDI. As 16 fotos (8 posições x 2 arcadas) foram geradas
// como referência e recortadas individualmente com fundo transparente.
const POSITION_FILE: Record<number, string> = {
  1: "incisivo-central",
  2: "incisivo-lateral",
  3: "canino",
  4: "premolar-1",
  5: "premolar-2",
  6: "molar-1",
  7: "molar-2",
  8: "molar-3",
};

export function getToothImagePath(fdi: string): string {
  const position = Number(fdi[1]);
  const arch = getArch(fdi);
  return `/teeth/${arch}-${POSITION_FILE[position]}.png`;
}

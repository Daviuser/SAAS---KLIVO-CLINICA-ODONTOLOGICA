/** Módulos exibidos nesta implantação médica; os módulos originais permanecem no projeto. */
export const CLINIC_UI = {
  enabledModules: ["dashboard", "agenda", "consultas", "patients", "atestados", "records", "settings", "users"],
  blockedPaths: ["/procedures", "/financial", "/commissions", "/reports", "/print/orcamento"],
} as const;

export function isClinicPathAllowed(pathname: string) {
  if (pathname.includes("/odontograma") || pathname.includes("/orcamentos")) return false;
  return !CLINIC_UI.blockedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";

export function PatientTabs({
  patientId,
  permissions,
}: {
  patientId: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const has = (permission: string) => permissions.includes(permission);

  const tabs = [
    { label: "Dados pessoais", href: `/patients/${patientId}`, visible: true },
    { label: "Prontuário", href: `/patients/${patientId}/prontuario`, visible: has(PERMISSIONS.RECORDS_READ) },
    { label: "Odontograma", href: `/patients/${patientId}/odontograma`, visible: has(PERMISSIONS.ODONTOGRAM_READ) },
    { label: "Orçamentos", href: `/patients/${patientId}/orcamentos`, visible: has(PERMISSIONS.BUDGETS_READ) },
  ].filter((tab) => tab.visible);

  return (
    <div className="mt-6 border-b border-border flex gap-6 text-sm">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`pb-2 border-b-2 ${
              active ? "border-primary text-primary font-medium" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

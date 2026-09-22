"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  ClipboardList,
  BarChart3,
  PiggyBank,
  Settings,
  X,
} from "lucide-react";
import { ToothIcon } from "@/components/brand/Logo";
import { BRAND_NAME } from "@/lib/brand";
import { PERMISSIONS } from "@/lib/permissions";

// `permission: null` = todo usuário autenticado vê (ex: Dashboard).
// Qualquer outro valor exige que a permissão esteja na lista do usuário.
const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null },
  { label: "Pacientes", href: "/patients", icon: Users, permission: PERMISSIONS.PATIENTS_READ },
  { label: "Agenda", href: "/agenda", icon: CalendarDays, permission: PERMISSIONS.AGENDA_READ },
  { label: "Procedimentos", href: "/procedures", icon: ClipboardList, permission: PERMISSIONS.PROCEDURES_READ },
  { label: "Financeiro", href: "/financial", icon: Wallet, permission: PERMISSIONS.FINANCIAL_READ },
  { label: "Comissões", href: "/commissions", icon: PiggyBank, permission: PERMISSIONS.COMMISSIONS_READ },
  { label: "Relatórios", href: "/reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_READ },
];

export function Sidebar({
  clinicName,
  permissions,
  mobileOpen = false,
  onClose,
}: {
  clinicName: string;
  permissions: string[];
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const permissionSet = new Set(permissions);
  const has = (permission: string | null) => permission === null || permissionSet.has(permission);

  // Configurações só aparece se o usuário tiver acesso a pelo menos uma
  // das seções que existem lá dentro (salas/cadeiras ou usuários).
  const showSettings = has(PERMISSIONS.AGENDA_WRITE) || has(PERMISSIONS.USERS_MANAGE);

  const visibleItems = NAV_ITEMS.filter((item) => has(item.permission));

  const content = (
    <>
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <ToothIcon size={22} className="text-primary-light shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-lg leading-none" style={{ fontWeight: 600 }}>{BRAND_NAME}</p>
            <p className="text-xs text-white/50 mt-1 truncate max-w-[150px]">{clinicName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-white/60 hover:text-white"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors ${
                active
                  ? "border-primary-light bg-white/5 text-white"
                  : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={17} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {showSettings && (
        <div className="px-3 pb-4">
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors ${
              pathname?.startsWith("/settings")
                ? "border-primary-light bg-white/5 text-white"
                : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings size={17} strokeWidth={1.75} />
            Configurações
          </Link>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Sidebar fixa — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-ink text-white flex-col">
        {content}
      </aside>

      {/* Drawer — mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-ink text-white flex flex-col animate-fade-in-up">
            {content}
          </div>
          <button
            className="flex-1 bg-black/40"
            onClick={onClose}
            aria-label="Fechar menu"
          />
        </div>
      )}
    </>
  );
}

"use client";

import { signOut } from "next-auth/react";
import { Menu } from "lucide-react";

export function Topbar({
  userName,
  roleName,
  onMenuClick,
}: {
  userName: string;
  roleName: string;
  onMenuClick?: () => void;
}) {
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 border-b border-border flex items-center justify-between lg:justify-end px-4 lg:px-8 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-ink-muted hover:text-ink"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-ink leading-tight">{userName}</p>
          <p className="text-xs text-ink-muted leading-tight">{roleName}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-medium flex items-center justify-center">
          {initials}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="ml-1 text-xs text-ink-muted hover:text-ink border border-border rounded px-2.5 py-1.5"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

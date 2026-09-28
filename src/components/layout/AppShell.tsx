"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverdueAppointmentsAlert } from "./OverdueAppointmentsAlert";

export function AppShell({
  clinicName,
  userName,
  roleName,
  permissions,
  children,
}: {
  clinicName: string;
  userName: string;
  roleName: string;
  permissions: string[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        clinicName={clinicName}
        roleName={roleName}
        permissions={permissions}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          userName={userName}
          roleName={roleName}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <OverdueAppointmentsAlert />
    </div>
  );
}

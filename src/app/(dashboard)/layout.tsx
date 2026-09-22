import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/lib/authorization";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const [organization, permissions] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    }),
    getUserPermissions(user.roleId),
  ]);

  return (
    <AppShell
      clinicName={organization?.name ?? ""}
      userName={user.name}
      roleName={user.roleName}
      permissions={permissions}
    >
      {children}
    </AppShell>
  );
}

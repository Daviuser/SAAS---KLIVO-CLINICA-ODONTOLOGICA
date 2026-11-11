import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ReceptionDashboard } from "@/components/dashboard/ReceptionDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.organizationId) redirect("/login");
  return <ReceptionDashboard user={user} />;
}

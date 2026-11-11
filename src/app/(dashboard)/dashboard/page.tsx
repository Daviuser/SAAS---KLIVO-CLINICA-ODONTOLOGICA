import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReceptionDashboard } from "@/components/dashboard/ReceptionDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  return <ReceptionDashboard user={session?.user as any} />;
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { DentistDashboard } from "@/components/dashboard/DentistDashboard";
import { ReceptionDashboard } from "@/components/dashboard/ReceptionDashboard";

// O papel que decide qual dashboard aparece vem do JWT da sessão
// (populado em src/lib/auth.ts a partir do banco no login), nunca de
// algo que o cliente possa manipular. Qualquer papel que não seja
// especificamente "Profissional" (dentista) ou "Recepcionista" cai no
// dashboard administrativo/geral já existente — preserva o
// comportamento atual para Administrador, Gestor, Financeiro e
// qualquer papel customizado que a clínica venha a criar.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (user?.roleName === "Profissional") {
    return <DentistDashboard user={user} />;
  }

  if (user?.roleName === "Recepcionista") {
    return <ReceptionDashboard user={user} />;
  }

  return <AdminDashboard user={user} />;
}

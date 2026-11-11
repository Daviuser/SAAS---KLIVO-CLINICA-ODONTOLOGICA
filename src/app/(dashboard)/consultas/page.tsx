import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ConsultationsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !(await userHasPermission(user.roleId, PERMISSIONS.RECORDS_READ))) redirect("/dashboard");

  const appointments = await withTenantContext(user.organizationId, (tx) => tx.appointment.findMany({
    where: { organizationId: user.organizationId, status: "concluida" },
    orderBy: { startsAt: "desc" },
    take: 100,
    include: { patient: { select: { id: true, name: true } } },
  }));

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Consultas</h1>
          <p className="mt-1 text-sm text-ink-muted">Histórico cronológico dos atendimentos concluídos.</p>
        </div>
        <Link href="/patients" className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">Selecionar paciente</Link>
      </div>

      <div className="mt-6 overflow-hidden rounded border border-border bg-white">
        {appointments.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">Ainda não há atendimentos concluídos.</p>
        ) : (
          <ul className="divide-y divide-border">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-medium text-ink">{appointment.patient.name}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(appointment.startsAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })}
                  </p>
                </div>
                <Link href={`/patients/${appointment.patient.id}/prontuario`} className="text-sm font-medium text-primary hover:text-primary-dark">Abrir prontuário</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

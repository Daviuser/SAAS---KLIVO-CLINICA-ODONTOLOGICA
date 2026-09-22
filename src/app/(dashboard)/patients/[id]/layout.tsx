import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { getUserPermissions } from "@/lib/authorization";
import { PatientTabs } from "./tabs";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const patient = await withTenantContext(user.organizationId, (tx) =>
    tx.patient.findUnique({ where: { id: params.id } })
  );

  if (!patient || patient.organizationId !== user.organizationId) {
    notFound();
  }

  const permissions = await getUserPermissions(user.roleId);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-ink">{patient.name}</h1>
      <p className="text-sm text-ink-muted mt-1">
        {patient.document ?? "CPF não informado"} ·{" "}
        {patient.phone ?? patient.whatsapp ?? "sem telefone"}
      </p>

      <PatientTabs patientId={params.id} permissions={permissions} />

      <div className="mt-6">{children}</div>
    </div>
  );
}

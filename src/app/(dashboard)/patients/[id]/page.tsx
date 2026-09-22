import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  const patient = await withTenantContext(user.organizationId, (tx) =>
    tx.patient.findUnique({ where: { id: params.id } })
  );

  if (!patient) return null; // layout já trata o notFound

  return (
    <div className="bg-white border border-border rounded p-6 grid grid-cols-2 gap-4 text-sm">
      <InfoRow label="E-mail" value={patient.email} />
      <InfoRow label="WhatsApp" value={patient.whatsapp} />
      <InfoRow
        label="Data de nascimento"
        value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : null}
      />
      <InfoRow
        label="Endereço"
        value={
          patient.addressStreet
            ? `${patient.addressStreet}, ${patient.addressNumber ?? "s/n"} — ${patient.addressCity ?? ""}/${patient.addressState ?? ""}`
            : null
        }
      />
      <InfoRow label="Contato de emergência" value={patient.emergencyContactName} />
      <InfoRow label="Telefone de emergência" value={patient.emergencyContactPhone} />
      <InfoRow label="Observações" value={patient.notes} className="col-span-2" />
    </div>
  );
}

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-ink-muted">{label}</p>
      <p className="text-ink mt-0.5">{value || "—"}</p>
    </div>
  );
}

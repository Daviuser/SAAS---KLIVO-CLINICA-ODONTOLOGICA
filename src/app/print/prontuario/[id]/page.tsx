import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print/PrintButton";
import { ToothIcon } from "@/components/brand/Logo";
import { BRAND_NAME } from "@/lib/brand";

const TYPE_LABELS: Record<string, string> = {
  evolucao: "Evolução",
  diagnostico: "Diagnóstico",
  plano_tratamento: "Plano de tratamento",
  procedimento_realizado: "Procedimento realizado",
  anexo: "Anexo",
};

export default async function PrintProntuarioPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) notFound();

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, document: true },
  });

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient || patient.organizationId !== user.organizationId) return null;

    const medicalRecord = await tx.medicalRecord.findUnique({
      where: { patientId: params.id },
      include: { entries: { orderBy: { createdAt: "asc" } } },
    });

    const toothRecords = await tx.toothRecord.findMany({
      where: { patientId: params.id, NOT: { condition: "higido" } },
      orderBy: { toothNumber: "asc" },
    });

    return { patient, medicalRecord, toothRecords };
  });

  if (!result) notFound();
  const { patient, medicalRecord, toothRecords } = result;

  const printedAt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <PrintButton />

      <div className="max-w-3xl mx-auto bg-white p-10 print:p-0 my-8 print:my-0 shadow-sm print:shadow-none">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <ToothIcon size={26} className="text-primary" />
            <div>
              <p className="font-display text-lg" style={{ fontWeight: 600 }}>{BRAND_NAME}</p>
              <p className="text-xs text-ink-muted">{organization?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-ink">Prontuário Odontológico</p>
            <p className="text-xs text-ink-muted">Impresso em {printedAt}</p>
          </div>
        </div>

        {/* Dados do paciente */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Identificação do paciente
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm border border-border rounded p-4">
            <Field label="Nome" value={patient.name} />
            <Field label="CPF" value={patient.document} />
            <Field
              label="Data de nascimento"
              value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("pt-BR") : null}
            />
            <Field label="Telefone" value={patient.phone ?? patient.whatsapp} />
            <Field
              label="Endereço"
              value={
                patient.addressStreet
                  ? `${patient.addressStreet}, ${patient.addressNumber ?? "s/n"} — ${patient.addressCity ?? ""}/${patient.addressState ?? ""}`
                  : null
              }
              className="col-span-2"
            />
            <Field label="Contato de emergência" value={patient.emergencyContactName} />
            <Field label="Telefone de emergência" value={patient.emergencyContactPhone} />
          </div>
        </section>

        {/* Anamnese */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Anamnese e histórico de saúde
          </h2>
          <div className="text-sm border border-border rounded p-4 space-y-3">
            <Field label="Anamnese" value={medicalRecord?.anamnesis} block />
            <Field label="Alergias" value={medicalRecord?.allergies} block />
            <Field label="Medicações em uso" value={medicalRecord?.medications} block />
          </div>
        </section>

        {/* Odontograma resumido — só os dentes com alguma alteração */}
        {toothRecords.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
              Odontograma — alterações registradas
            </h2>
            <table className="w-full text-sm border border-border rounded overflow-hidden">
              <thead className="bg-surface print:bg-white print:border-b print:border-border">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Dente</th>
                  <th className="px-3 py-2 font-medium">Condição</th>
                  <th className="px-3 py-2 font-medium">Tratamento planejado</th>
                  <th className="px-3 py-2 font-medium">Tratamento realizado</th>
                </tr>
              </thead>
              <tbody>
                {toothRecords.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{t.toothNumber}</td>
                    <td className="px-3 py-2">{t.condition ?? "—"}</td>
                    <td className="px-3 py-2">{t.plannedProcedure ?? "—"}</td>
                    <td className="px-3 py-2">{t.performedProcedure ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Histórico clínico */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Histórico clínico
          </h2>
          {(!medicalRecord || medicalRecord.entries.length === 0) && (
            <p className="text-sm text-ink-muted">Nenhuma entrada registrada.</p>
          )}
          <div className="space-y-4">
            {medicalRecord?.entries.map((entry) => (
              <div key={entry.id} className="border-l-2 border-primary pl-3 break-inside-avoid">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-primary">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                  <span>·</span>
                  <span>{new Date(entry.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-sm text-ink mt-1 whitespace-pre-wrap">{entry.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Assinatura */}
        <div className="grid grid-cols-2 gap-8 pt-10 mt-10 border-t border-border text-center text-xs text-ink-muted">
          <div>
            <div className="border-t border-ink-muted/40 pt-1 mx-8">Assinatura do responsável</div>
          </div>
          <div>
            <div className="border-t border-ink-muted/40 pt-1 mx-8">Assinatura do paciente/responsável legal</div>
          </div>
        </div>

        <p className="text-[10px] text-ink-muted/60 text-center mt-8">
          Documento gerado eletronicamente pelo {BRAND_NAME} — não substitui laudo original quando exigido por lei.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
  block = false,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
  block?: boolean;
}) {
  if (block) {
    return (
      <div>
        <p className="text-xs text-ink-muted mb-0.5">{label}</p>
        <p className="text-ink whitespace-pre-wrap">{value || "Não informado."}</p>
      </div>
    );
  }
  return (
    <div className={className}>
      <span className="text-ink-muted">{label}: </span>
      <span className="text-ink font-medium">{value || "—"}</span>
    </div>
  );
}

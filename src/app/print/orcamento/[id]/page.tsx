import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print/PrintButton";
import { ToothIcon } from "@/components/brand/Logo";
import { BRAND_NAME } from "@/lib/brand";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado ao paciente",
  approved: "Aprovado",
  rejected: "Recusado",
};

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PrintBudgetPage({
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

  const budget = await withTenantContext(user.organizationId, async (tx) => {
    const b = await tx.budget.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        patient: true,
      },
    });
    if (!b || b.organizationId !== user.organizationId) return null;

    let professionalName: string | null = null;
    if (b.professionalUserId) {
      const prof = await tx.user.findUnique({ where: { id: b.professionalUserId }, select: { name: true } });
      professionalName = prof?.name ?? null;
    }

    return { ...b, professionalName };
  });

  if (!budget) notFound();

  const total = budget.items.reduce((sum, item) => sum + Number(item.total), 0);
  const validUntil = new Date(budget.createdAt);
  validUntil.setDate(validUntil.getDate() + 30);
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
            <p className="text-sm font-medium text-ink">Orçamento Odontológico</p>
            <p className="text-xs text-ink-muted">Emitido em {new Date(budget.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Paciente e status */}
        <section className="mb-6 grid grid-cols-2 gap-4 text-sm border border-border rounded p-4">
          <div>
            <p className="text-xs text-ink-muted mb-0.5">Paciente</p>
            <p className="text-ink font-medium">{budget.patient.name}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted mb-0.5">CPF</p>
            <p className="text-ink">{budget.patient.document ?? "—"}</p>
          </div>
          {budget.professionalName && (
            <div>
              <p className="text-xs text-ink-muted mb-0.5">Profissional responsável</p>
              <p className="text-ink">{budget.professionalName}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-ink-muted mb-0.5">Status</p>
            <p className="text-ink">{STATUS_LABELS[budget.status]}</p>
          </div>
        </section>

        {/* Itens */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Procedimentos propostos
          </h2>
          <table className="w-full text-sm border border-border rounded overflow-hidden">
            <thead className="bg-surface print:border-b print:border-border">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Procedimento</th>
                <th className="px-3 py-2 font-medium text-center">Qtd.</th>
                <th className="px-3 py-2 font-medium text-right">Valor unit.</th>
                <th className="px-3 py-2 font-medium text-right">Desconto</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {budget.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2">{item.procedureName}</td>
                  <td className="px-3 py-2 text-center">{item.quantity}</td>
                 <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unitPrice))}</td>
<td className="px-3 py-2 text-right">{formatCurrency(Number(item.discount))}</td>
<td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.total))}</td>git add .
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface print:border-t-2">
                <td colSpan={4} className="px-3 py-2 text-right font-semibold text-ink">Total geral</td>
                <td className="px-3 py-2 text-right font-display text-lg text-ink" style={{ fontWeight: 600 }}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Opções de pagamento — à vista ou cartão de crédito (parcelamento,
            quando houver, é combinado direto na maquininha da clínica) */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Opções de pagamento
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded p-4">
              <p className="text-xs text-ink-muted mb-1">À vista</p>
              <p className="font-display text-xl text-ink" style={{ fontWeight: 600 }}>
                {formatCurrency(total)}
              </p>
            </div>
            <div className="border border-border rounded p-4">
              <p className="text-xs text-ink-muted mb-1">Cartão de crédito</p>
              <p className="font-display text-xl text-ink" style={{ fontWeight: 600 }}>
                {formatCurrency(total)}
              </p>
              <p className="text-[11px] text-ink-muted mt-1">Parcelamento sujeito às condições da maquininha</p>
            </div>
          </div>
          <p className="text-xs text-ink-muted mt-2">
            Proposta válida até <strong className="text-ink">{validUntil.toLocaleDateString("pt-BR")}</strong>.
          </p>
        </section>

        {budget.notes && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Observações</h2>
            <p className="text-sm text-ink whitespace-pre-wrap border border-border rounded p-4">{budget.notes}</p>
          </section>
        )}

        {/* Assinatura */}
        <div className="grid grid-cols-2 gap-8 pt-10 mt-10 border-t border-border text-center text-xs text-ink-muted">
          <div>
            <div className="border-t border-ink-muted/40 pt-1 mx-8">Assinatura do responsável pela clínica</div>
          </div>
          <div>
            <div className="border-t border-ink-muted/40 pt-1 mx-8">Assinatura do paciente/responsável legal</div>
          </div>
        </div>

        <p className="text-[10px] text-ink-muted/60 text-center mt-8">
          Documento gerado eletronicamente pelo {BRAND_NAME} em {printedAt}.
        </p>
      </div>
    </div>
  );
}

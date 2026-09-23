import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.FINANCIAL_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending | partially_paid | paid | canceled

  const receivables = await withTenantContext(user.organizationId, (tx) =>
    tx.receivable.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { id: true, name: true } },
        installments: {
          orderBy: { number: "asc" },
          include: { commissionEntries: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  // Bruto = total da cobrança; comissão = soma das comissões geradas
  // sobre as parcelas dela; líquido = bruto - comissão. Isso é o que
  // vai pra financeiro mostrar de forma transparente pra clínica.
  const withNet = receivables.map((r) => {
    const totalCommission = r.installments.reduce(
      (sum, inst) => sum + inst.commissionEntries.reduce((s, c) => s + Number(c.amount), 0),
      0
    );
    return {
      ...r,
      totalCommission,
      netAmount: Number(r.totalAmount) - totalCommission,
    };
  });

  return NextResponse.json({ receivables: withNet });
}

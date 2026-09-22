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
        installments: { orderBy: { number: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  return NextResponse.json({ receivables });
}

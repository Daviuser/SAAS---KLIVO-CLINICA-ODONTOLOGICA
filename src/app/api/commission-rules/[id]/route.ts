import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.COMMISSIONS_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.commissionRule.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);
    await tx.commissionRule.delete({ where: { id: params.id } });
    return true;
  });

  if (!result) return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const patchSchema = z.object({
  status: z.enum(["pending", "paid", "canceled"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.FINANCIAL_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const payable = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.payable.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    return tx.payable.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        paidAt: parsed.data.status === "paid" ? new Date() : null,
      },
    });
  });

  if (!payable) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  return NextResponse.json({ payable });
}

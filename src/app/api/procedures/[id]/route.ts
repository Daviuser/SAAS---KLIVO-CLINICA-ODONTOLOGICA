import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { procedureSchema } from "@/lib/validation/procedure";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PROCEDURES_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = procedureSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const procedure = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.procedure.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    return tx.procedure.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        category: parsed.data.category === undefined ? undefined : parsed.data.category || null,
      },
    });
  });

  if (!procedure) return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 });
  return NextResponse.json({ procedure });
}

// Soft delete — desativa em vez de apagar (orçamentos antigos referenciam o procedimento)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PROCEDURES_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const procedure = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.procedure.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);
    return tx.procedure.update({ where: { id: params.id }, data: { active: false } });
  });

  if (!procedure) return NextResponse.json({ error: "Procedimento não encontrado" }, { status: 404 });
  return NextResponse.json({ success: true });
}

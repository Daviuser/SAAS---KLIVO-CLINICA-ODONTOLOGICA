import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { updateUserSchema } from "@/lib/validation/user";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.USERS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  // Impede o usuário de se autodesativar por engano e ficar trancado fora
  if (parsed.data.active === false && params.id === user.id) {
    return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
  }

  const updated = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    if (parsed.data.roleId) {
      const role = await tx.role.findUnique({ where: { id: parsed.data.roleId } });
      if (!role || role.organizationId !== user.organizationId) {
        throw new Error("INVALID_ROLE");
      }
    }

    return tx.user.update({
      where: { id: params.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, active: true, role: { select: { id: true, name: true } } },
    });
  }).catch((e) => {
    if (e.message === "INVALID_ROLE") return { invalidRole: true as const };
    throw e;
  });

  if (!updated) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if ("invalidRole" in updated) return NextResponse.json({ error: "Papel inválido" }, { status: 400 });

  return NextResponse.json({ user: updated });
}

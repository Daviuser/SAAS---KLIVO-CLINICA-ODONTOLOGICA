import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validation/user";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.USERS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const users = await withTenantContext(user.organizationId, (tx) =>
    tx.user.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, email: true, active: true, role: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    })
  );

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.USERS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    // E-mail é único POR organização (não globalmente) — ver nota em auth.ts
    const existing = await tx.user.findFirst({
      where: { organizationId: user.organizationId, email: parsed.data.email },
    });
    if (existing) return { duplicate: true as const };

    const role = await tx.role.findUnique({ where: { id: parsed.data.roleId } });
    if (!role || role.organizationId !== user.organizationId) return { invalidRole: true as const };

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const created = await tx.user.create({
      data: {
        organizationId: user.organizationId,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        roleId: parsed.data.roleId,
      },
      select: { id: true, name: true, email: true, active: true, role: { select: { id: true, name: true } } },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "user.create",
        entityType: "User",
        entityId: created.id,
        after: created as any,
      },
    });

    return { user: created };
  });

  if ("duplicate" in result) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail nesta clínica" }, { status: 409 });
  }
  if ("invalidRole" in result) {
    return NextResponse.json({ error: "Papel inválido" }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { procedureSchema } from "@/lib/validation/procedure";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PROCEDURES_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const procedures = await withTenantContext(user.organizationId, (tx) =>
    tx.procedure.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: "asc" },
    })
  );

  return NextResponse.json({ procedures });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PROCEDURES_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = procedureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const procedure = await withTenantContext(user.organizationId, (tx) =>
    tx.procedure.create({
      data: {
        organizationId: user.organizationId,
        name: parsed.data.name,
        category: parsed.data.category || null,
        defaultPrice: parsed.data.defaultPrice,
      },
    })
  );

  return NextResponse.json({ procedure }, { status: 201 });
}

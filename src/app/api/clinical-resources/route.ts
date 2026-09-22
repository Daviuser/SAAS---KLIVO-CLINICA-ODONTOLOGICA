import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const resourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["sala", "cadeira"]).default("cadeira"),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "1";

  const resources = await withTenantContext(user.organizationId, (tx) =>
    tx.clinicalResource.findMany({
      where: { organizationId: user.organizationId, ...(includeInactive ? {} : { active: true }) },
      orderBy: { name: "asc" },
    })
  );

  return NextResponse.json({ resources });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = resourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const resource = await withTenantContext(user.organizationId, (tx) =>
    tx.clinicalResource.create({
      data: { organizationId: user.organizationId, name: parsed.data.name, type: parsed.data.type },
    })
  );

  return NextResponse.json({ resource }, { status: 201 });
}

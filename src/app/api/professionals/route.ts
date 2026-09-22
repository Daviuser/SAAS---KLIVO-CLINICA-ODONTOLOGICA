import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

// Lista usuários ativos com papel "Profissional" — usado para preencher
// o seletor de dentista responsável ao criar uma consulta ou orçamento.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const professionals = await withTenantContext(user.organizationId, (tx) =>
    tx.user.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        role: { name: "Profissional" },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  );

  return NextResponse.json({ professionals });
}

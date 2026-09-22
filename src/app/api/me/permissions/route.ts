import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPermissions } from "@/lib/authorization";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const permissions = await getUserPermissions(user.roleId);
  return NextResponse.json({ permissions });
}

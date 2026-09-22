import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const payableSchema = z.object({
  description: z.string().min(2),
  category: z.string().optional().nullable(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.FINANCIAL_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const payables = await withTenantContext(user.organizationId, (tx) =>
    tx.payable.findMany({
      where: { organizationId: user.organizationId, ...(status ? { status } : {}) },
      orderBy: { dueDate: "asc" },
    })
  );

  return NextResponse.json({ payables });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.FINANCIAL_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = payableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const payable = await withTenantContext(user.organizationId, (tx) =>
    tx.payable.create({
      data: {
        organizationId: user.organizationId,
        description: parsed.data.description,
        category: parsed.data.category || null,
        amount: parsed.data.amount,
        dueDate: new Date(parsed.data.dueDate),
      },
    })
  );

  return NextResponse.json({ payable }, { status: 201 });
}

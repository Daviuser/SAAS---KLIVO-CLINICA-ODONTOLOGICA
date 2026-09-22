import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.COMMISSIONS_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  // Quem NÃO tem COMMISSIONS_WRITE (ou seja, um dentista comum) só pode
  // ver o próprio extrato — nunca o de outro profissional, mesmo que
  // tente passar outro id na query string.
  const canSeeAll = await userHasPermission(user.roleId, PERMISSIONS.COMMISSIONS_WRITE);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : null;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : null;
  const requestedProfessionalId = searchParams.get("professionalUserId");

  const professionalUserId = canSeeAll ? requestedProfessionalId || undefined : user.id;

  const entries = await withTenantContext(user.organizationId, async (tx) => {
    const rows = await tx.commissionEntry.findMany({
      where: {
        organizationId: user.organizationId,
        ...(professionalUserId ? { professionalUserId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: {
        receivableInstallment: {
          include: {
            receivable: {
              include: {
                patient: { select: { id: true, name: true } },
                appointment: { include: { procedure: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Nomes dos profissionais, pra quando o gestor está vendo "todos"
    const profIds = Array.from(new Set(rows.map((r) => r.professionalUserId)));
    const professionals = profIds.length
      ? await tx.user.findMany({ where: { id: { in: profIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(professionals.map((p) => [p.id, p.name]));

    return rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      percentageApplied: Number(r.percentageApplied),
      createdAt: r.createdAt,
      professionalUserId: r.professionalUserId,
      professionalName: nameById.get(r.professionalUserId) ?? "—",
      patientName: r.receivableInstallment.receivable.patient?.name ?? "—",
      procedureName: r.receivableInstallment.receivable.appointment?.procedure?.name ?? "—",
    }));
  });

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ entries, total, canSeeAll });
}

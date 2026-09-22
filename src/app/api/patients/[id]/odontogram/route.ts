import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

// Lista todos os registros de dente já lançados para o paciente.
// Dentes sem registro simplesmente não aparecem aqui — o frontend
// desenha os 32 dentes fixos e preenche com o que vier da API.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.ODONTOGRAM_READ);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient) return { notFound: true as const };
    assertSameOrganization(patient.organizationId, user.organizationId);

    const teeth = await tx.toothRecord.findMany({ where: { patientId: params.id } });
    return { teeth };
  });

  if ("notFound" in result) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

const toothSchema = z.object({
  toothNumber: z.string().min(2).max(3), // notação FDI, ex: "11", "36"
  condition: z.string().optional().nullable(),
  plannedProcedure: z.string().optional().nullable(),
  performedProcedure: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Upsert de um dente. A mudança fica registrada no AuditLog
// (before/after) — isso é o "histórico" do odontograma pedido no
// escopo original, sem precisar de uma tabela de versões separada.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.ODONTOGRAM_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = toothSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient) return { notFound: true as const };
    assertSameOrganization(patient.organizationId, user.organizationId);

    const existing = await tx.toothRecord.findUnique({
      where: { patientId_toothNumber: { patientId: params.id, toothNumber: data.toothNumber } },
    });

    const tooth = await tx.toothRecord.upsert({
      where: { patientId_toothNumber: { patientId: params.id, toothNumber: data.toothNumber } },
      create: {
        organizationId: user.organizationId,
        patientId: params.id,
        toothNumber: data.toothNumber,
        condition: data.condition ?? null,
        plannedProcedure: data.plannedProcedure ?? null,
        performedProcedure: data.performedProcedure ?? null,
        notes: data.notes ?? null,
        updatedBy: user.id,
      },
      update: {
        condition: data.condition ?? null,
        plannedProcedure: data.plannedProcedure ?? null,
        performedProcedure: data.performedProcedure ?? null,
        notes: data.notes ?? null,
        updatedBy: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: existing ? "tooth_record.update" : "tooth_record.create",
        entityType: "ToothRecord",
        entityId: tooth.id,
        before: existing as any,
        after: tooth as any,
      },
    });

    return { tooth };
  });

  if ("notFound" in result) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

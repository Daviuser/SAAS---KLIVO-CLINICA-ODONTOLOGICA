import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const updateSchema = z.object({
  anamnesis: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
});

// Busca (ou cria vazio, se ainda não existir) o prontuário do paciente,
// junto com as últimas entradas de evolução.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.RECORDS_READ);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const record = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient) return { notFound: true as const };
    assertSameOrganization(patient.organizationId, user.organizationId);

    let medicalRecord = await tx.medicalRecord.findUnique({
      where: { patientId: params.id },
      include: {
        entries: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    // Cria o prontuário vazio na primeira vez que alguém abre a aba
    if (!medicalRecord) {
      medicalRecord = await tx.medicalRecord.create({
        data: { organizationId: user.organizationId, patientId: params.id },
        include: { entries: true },
      });
    }

    return { medicalRecord };
  });

  if ("notFound" in record) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(record);
}

// Atualiza os dados de cabeceira (NÃO gera nova entrada de histórico —
// isso é feito pela rota /entries, que é imutável).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.RECORDS_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: params.id } });
    if (!patient) return { notFound: true as const };
    assertSameOrganization(patient.organizationId, user.organizationId);

    const existing = await tx.medicalRecord.findUnique({
      where: { patientId: params.id },
    });

    const updated = existing
      ? await tx.medicalRecord.update({
          where: { patientId: params.id },
          data: parsed.data,
        })
      : await tx.medicalRecord.create({
          data: { organizationId: user.organizationId, patientId: params.id, ...parsed.data },
        });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "medical_record.update",
        entityType: "MedicalRecord",
        entityId: updated.id,
        before: existing as any,
        after: updated as any,
      },
    });

    return { medicalRecord: updated };
  });

  if ("notFound" in result) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}

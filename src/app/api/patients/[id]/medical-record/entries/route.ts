import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

const entrySchema = z.object({
  type: z.enum(["evolucao", "diagnostico", "plano_tratamento", "procedimento_realizado", "anexo"]),
  content: z.string().min(1, "Conteúdo é obrigatório"),
});

// Cria uma nova entrada no histórico clínico. Entradas NUNCA são
// editadas ou apagadas depois de criadas — isso é o que garante que
// o prontuário tenha um histórico confiável para auditoria.
export async function POST(
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
  const parsed = entrySchema.safeParse(body);
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

    let medicalRecord = await tx.medicalRecord.findUnique({
      where: { patientId: params.id },
    });
    if (!medicalRecord) {
      medicalRecord = await tx.medicalRecord.create({
        data: { organizationId: user.organizationId, patientId: params.id },
      });
    }

    const entry = await tx.recordEntry.create({
      data: {
        organizationId: user.organizationId,
        medicalRecordId: medicalRecord.id,
        authorUserId: user.id,
        type: parsed.data.type,
        content: parsed.data.content,
      },
    });

    // A própria entrada já É o registro de auditoria clínica, mas
    // deixamos também no AuditLog geral para consulta cruzada por usuário.
    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "record_entry.create",
        entityType: "RecordEntry",
        entityId: entry.id,
        after: entry as any,
      },
    });

    return { entry };
  });

  if ("notFound" in result) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json(result, { status: 201 });
}

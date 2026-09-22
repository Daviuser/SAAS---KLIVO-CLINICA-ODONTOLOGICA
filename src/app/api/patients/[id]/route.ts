import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission, assertSameOrganization } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { patientSchema } from "@/lib/validation/patient";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PATIENTS_READ);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const patient = await withTenantContext(user.organizationId, (tx) =>
    tx.patient.findUnique({ where: { id: params.id } })
  );

  if (!patient) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  // Defesa em profundidade — mesmo com RLS, confirmamos aqui também.
  try {
    assertSameOrganization(patient.organizationId, user.organizationId);
  } catch {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PATIENTS_WRITE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patientSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const patient = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.patient.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    const data = parsed.data;
    const updated = await tx.patient.update({
      where: { id: params.id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "patient.update",
        entityType: "Patient",
        entityId: updated.id,
        before: existing as any,
        after: updated as any,
      },
    });

    return updated;
  });

  if (!patient) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PATIENTS_DELETE);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Soft delete: nunca apagamos fisicamente dado de paciente (auditoria/LGPD).
  const patient = await withTenantContext(user.organizationId, async (tx) => {
    const existing = await tx.patient.findUnique({ where: { id: params.id } });
    if (!existing) return null;
    assertSameOrganization(existing.organizationId, user.organizationId);

    const updated = await tx.patient.update({
      where: { id: params.id },
      data: { active: false },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "patient.deactivate",
        entityType: "Patient",
        entityId: updated.id,
        before: existing as any,
      },
    });

    return updated;
  });

  if (!patient) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

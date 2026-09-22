import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { patientSchema } from "@/lib/validation/patient";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.PATIENTS_READ);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const patients = await withTenantContext(user.organizationId, (tx) =>
    tx.patient.findMany({
      where: {
        organizationId: user.organizationId, // defesa em profundidade, além do RLS
        active: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { document: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        document: true,
        phone: true,
        whatsapp: true,
        birthDate: true,
        createdAt: true,
      },
    })
  );

  return NextResponse.json({ patients });
}

export async function POST(req: Request) {
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
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const patient = await withTenantContext(user.organizationId, async (tx) => {
    const created = await tx.patient.create({
      data: {
        organizationId: user.organizationId,
        name: data.name,
        document: data.document || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        addressStreet: data.addressStreet || null,
        addressNumber: data.addressNumber || null,
        addressComplement: data.addressComplement || null,
        addressCity: data.addressCity || null,
        addressState: data.addressState || null,
        addressZipCode: data.addressZipCode || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        notes: data.notes || null,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "patient.create",
        entityType: "Patient",
        entityId: created.id,
        after: created as any,
      },
    });

    return created;
  });

  return NextResponse.json({ patient }, { status: 201 });
}

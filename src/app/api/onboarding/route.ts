import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

const onboardingSchema = z.object({
  clinicName: z.string().min(2),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clinicName, adminName, adminEmail, adminPassword } = parsed.data;

  // Cria tudo dentro de uma transação: clínica, unidade padrão,
  // permissões, papéis padrão e o usuário Admin.
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: clinicName,
        units: {
          create: { name: "Unidade Principal", isDefault: true },
        },
      },
    });

    // Garante que o catálogo global de permissões existe
    // (idempotente — roda uma vez por ambiente, mas é seguro repetir)
    const allPermissionKeys = Array.from(
      new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat())
    );
    await tx.permission.createMany({
      data: allPermissionKeys.map((key) => ({ key, label: key })),
      skipDuplicates: true,
    });

    const permissions = await tx.permission.findMany({
      where: { key: { in: allPermissionKeys } },
    });
    const permissionByKey = new Map(permissions.map((p) => [p.key, p.id]));

    // Cria os papéis padrão da clínica com suas permissões
    let adminRoleId = "";
    for (const [roleName, permKeys] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS
    )) {
      const role = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: roleName,
          isSystem: true,
          permissions: {
            create: permKeys.map((key) => ({
              permissionId: permissionByKey.get(key)!,
            })),
          },
        },
      });
      if (roleName === "Administrador") adminRoleId = role.id;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const adminUser = await tx.user.create({
      data: {
        organizationId: organization.id,
        name: adminName,
        email: adminEmail,
        passwordHash,
        roleId: adminRoleId,
      },
    });

    return { organization, adminUser };
  });

  return NextResponse.json({
    success: true,
    organizationId: result.organization.id,
  });
}

// Script utilitário — roda uma vez sempre que novas permissões forem
// adicionadas ao catálogo (DEFAULT_ROLE_PERMISSIONS), para que clínicas
// já existentes (criadas antes da mudança) recebam as permissões novas
// nos papéis padrão, sem perder nenhuma permissão customizada que a
// clínica já tenha alterado manualmente.
//
// Uso: npx tsx prisma/sync-permissions.ts

import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLE_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  const allPermissionKeys = Array.from(
    new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat())
  );

  // Garante que o catálogo global de permissões tem todas as chaves
  await prisma.permission.createMany({
    data: allPermissionKeys.map((key) => ({ key, label: key })),
    skipDuplicates: true,
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: allPermissionKeys } },
  });
  const permissionByKey = new Map(permissions.map((p) => [p.key, p.id]));

  const roles = await prisma.role.findMany({ where: { isSystem: true } });

  let added = 0;
  for (const role of roles) {
    const expectedKeys = DEFAULT_ROLE_PERMISSIONS[role.name];
    if (!expectedKeys) continue; // papel customizado, não mexe

    for (const key of expectedKeys) {
      const permissionId = permissionByKey.get(key)!;
      const exists = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId },
        });
        added++;
      }
    }
  }

  console.log(`Sincronização concluída. ${added} permissões novas atribuídas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

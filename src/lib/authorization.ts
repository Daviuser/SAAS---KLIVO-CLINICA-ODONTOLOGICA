import { prisma } from "@/lib/prisma";
import { PermissionKey } from "@/lib/permissions";

// ============================================================
// Permissões granulares REATIVADAS.
// Cada papel só pode fazer, no backend, o que está configurado na
// tabela role_permissions (populada no onboarding via
// DEFAULT_ROLE_PERMISSIONS, em src/lib/permissions.ts).
// ============================================================
const PERMISSION_CHECKS_ENABLED = true;

/**
 * Verifica se um usuário (via roleId) possui uma permissão específica.
 * Deve ser chamado em TODA rota de API que manipula dados sensíveis,
 * nunca confiar apenas na UI escondendo botões.
 */
export async function userHasPermission(
  roleId: string,
  permissionKey: PermissionKey
): Promise<boolean> {
  if (!PERMISSION_CHECKS_ENABLED) return true;

  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId,
      permission: { key: permissionKey },
    },
  });
  return !!rolePermission;
}

/**
 * Lista todas as chaves de permissão que um papel possui — usado pra
 * decidir o que mostrar na interface (sidebar, abas), não só pra
 * bloquear no backend. A UI é só conveniência; a defesa de verdade
 * continua sendo `userHasPermission` em cada rota de API.
 */
export async function getUserPermissions(roleId: string): Promise<string[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { key: true } } },
  });
  return rolePermissions.map((rp) => rp.permission.key);
}

/**
 * Garante que um recurso buscado pertence à organização do usuário logado.
 * Use isso (ou filtre diretamente por organizationId nas queries) em
 * TODO acesso a dado — essa é a linha de defesa principal do isolamento
 * multi-tenant a nível de aplicação.
 */
export function assertSameOrganization(
  resourceOrgId: string,
  sessionOrgId: string
) {
  if (resourceOrgId !== sessionOrgId) {
    throw new Error("FORBIDDEN_CROSS_TENANT_ACCESS");
  }
}

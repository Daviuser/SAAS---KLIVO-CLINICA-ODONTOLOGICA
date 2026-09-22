import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Executa uma operação Prisma dentro de uma transação que primeiro
 * seta a variável de sessão `app.current_org_id`, usada pelas políticas
 * de RLS no Postgres (ver prisma/rls/enable_rls.sql).
 *
 * Isso é a camada de defesa EXTRA — mesmo com essa função, toda query
 * dentro do callback deve continuar filtrando por organizationId
 * normalmente (defesa em profundidade, nunca confiar em uma única camada).
 *
 * Uso:
 *   const patients = await withTenantContext(session.organizationId, (tx) =>
 *     tx.patient.findMany({ where: { organizationId: session.organizationId } })
 *   );
 */
export async function withTenantContext<T>(
  organizationId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SET LOCAL só vale dentro da transação atual — seguro em ambiente
    // com connection pooling, não vaza para outras requisições.
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
    return callback(tx);
  });
}

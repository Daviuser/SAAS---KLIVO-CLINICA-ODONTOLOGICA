import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";

// Consultas com status "confirmada" cujo horário já passou e ninguém
// atualizou (iniciou, concluiu, cancelou ou marcou falta). É o que
// alimenta o alerta persistente no topo da tela — a lista só fica vazia
// depois que o status de cada consulta listada é de fato alterado.
//
// Escopo: só considera o dia de hoje (uma consulta confirmada de um dia
// anterior que nunca foi atualizada é um problema de dado antigo, não
// o "avisar que passou do horário" que foi pedido — para isso o ideal é
// um relatório de agenda, não este alerta).
//
// Mesma regra de visibilidade da agenda: dentista (papel "Profissional")
// só vê as próprias; qualquer outro papel com AGENDA_READ vê as da
// clínica inteira. Decidido pela sessão autenticada, nunca por um
// parâmetro vindo do cliente.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const isDentist = user.roleName === "Profissional";

  const overdue = await withTenantContext(user.organizationId, async (tx) => {
    const appointments = await tx.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        status: "confirmada",
        startsAt: { gte: dayStart, lt: now },
        ...(isDentist ? { professionalUserId: user.id } : {}),
      },
      orderBy: { startsAt: "asc" },
      take: 20,
      include: {
        patient: { select: { id: true, name: true } },
        procedure: { select: { name: true } },
      },
    });

    // Nome do profissional, só quando faz sentido mostrar (visão da
    // clínica inteira) — pro dentista, é sempre ele mesmo, sem necessidade
    // de mais uma consulta.
    let professionalNameById = new Map<string, string>();
    if (!isDentist && appointments.length > 0) {
      const ids = Array.from(new Set(appointments.map((a) => a.professionalUserId)));
      const professionals = await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      professionalNameById = new Map(professionals.map((p) => [p.id, p.name]));
    }

    return appointments.map((a) => ({
      id: a.id,
      patientId: a.patient.id,
      patientName: a.patient.name,
      procedureName: a.procedure?.name ?? null,
      professionalName: isDentist ? null : professionalNameById.get(a.professionalUserId) ?? "—",
      startsAt: a.startsAt,
    }));
  });

  return NextResponse.json({ overdue });
}

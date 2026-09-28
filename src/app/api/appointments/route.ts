import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withTenantContext } from "@/lib/tenant-context";
import { userHasPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permissions";
import { appointmentSchema } from "@/lib/validation/appointment";

// Lista consultas num intervalo de datas (?from=ISO&to=ISO).
// Sem intervalo, retorna as do dia atual.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_READ);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const startsAt =
    from && to
      ? { gte: new Date(from), lte: new Date(to) }
      : (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          return { gte: start, lte: end };
        })();

  // Dentista só enxerga a PRÓPRIA agenda (matriz de permissões: Agenda =
  // "Própria" pro papel Profissional). Admin, recepção e gestor continuam
  // vendo a agenda inteira da clínica. Isso é reforçado aqui no backend —
  // não importa o que o frontend pediu, um dentista nunca recebe consulta
  // de outro profissional nessa resposta.
  const isDentist = user.roleName === "Profissional";

  const appointments = await withTenantContext(user.organizationId, (tx) =>
    tx.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        startsAt,
        ...(isDentist ? { professionalUserId: user.id } : {}),
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, whatsapp: true } },
        resource: { select: { id: true, name: true } },
        procedure: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    })
  );

  return NextResponse.json({ appointments });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const user = session.user as any;

  const allowed = await userHasPermission(user.roleId, PERMISSIONS.AGENDA_WRITE);
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Um dentista (papel "Profissional") só pode criar consulta em nome
  // de SI MESMO — nunca atribuída a outro profissional, mesmo que
  // envie outro professionalUserId no corpo da requisição. Quem pode
  // agendar em nome de qualquer profissional (recepção, admin, gestor)
  // não é afetado por essa checagem.
  if (user.roleName === "Profissional" && data.professionalUserId !== user.id) {
    return NextResponse.json(
      { error: "Você só pode criar consultas em sua própria agenda" },
      { status: 403 }
    );
  }

  const result = await withTenantContext(user.organizationId, async (tx) => {
    // Checa conflito de horário — mesmo profissional OU mesma
    // sala/cadeira sobrepondo o intervalo, ignorando canceladas.
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60000);

    const conflicting = await tx.appointment.findFirst({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ["cancelada", "faltou"] },
        OR: [
          { professionalUserId: data.professionalUserId },
          ...(data.resourceId ? [{ resourceId: data.resourceId }] : []),
        ],
        AND: [
          { startsAt: { lt: endsAt } },
          // usamos startsAt + duração calculada no app; para overlap
          // preciso comparar contra o fim de cada consulta existente,
          // o que o Prisma não calcula em query — então trago candidatas
          // próximas e filtro no código abaixo.
        ],
      },
    });

    // Filtro fino de sobreposição em memória (janela pequena, ok pra volume de uma clínica)
    const candidates = await tx.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        status: { notIn: ["cancelada", "faltou"] },
        OR: [
          { professionalUserId: data.professionalUserId },
          ...(data.resourceId ? [{ resourceId: data.resourceId }] : []),
        ],
      },
    });
    const hasOverlap = candidates.some((appt) => {
      const apptEnd = new Date(appt.startsAt.getTime() + appt.durationMinutes * 60000);
      return startsAt < apptEnd && appt.startsAt < endsAt;
    });
    if (hasOverlap) {
      throw new Error("SCHEDULE_CONFLICT");
    }

    const appointment = await tx.appointment.create({
      data: {
        organizationId: user.organizationId,
        patientId: data.patientId,
        professionalUserId: data.professionalUserId,
        resourceId: data.resourceId || null,
        procedureId: data.procedureId || null,
        startsAt,
        durationMinutes: data.durationMinutes,
        notes: data.notes || null,
      },
      include: {
        patient: { select: { id: true, name: true } },
        resource: { select: { id: true, name: true } },
        procedure: { select: { id: true, name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "appointment.create",
        entityType: "Appointment",
        entityId: appointment.id,
        after: appointment as any,
      },
    });

    return { appointment };
  }).catch((e) => {
    if (e.message === "SCHEDULE_CONFLICT") return { conflict: true as const };
    throw e;
  });

  if ("conflict" in result) {
    return NextResponse.json(
      { error: "Já existe uma consulta nesse horário para esse profissional ou sala/cadeira" },
      { status: 409 }
    );
  }

  return NextResponse.json(result, { status: 201 });
}

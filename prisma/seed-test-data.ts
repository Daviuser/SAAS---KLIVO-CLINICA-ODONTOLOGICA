// Script de seed — popula o banco com dados de teste (10 pacientes,
// 10 procedimentos) na primeira clínica encontrada no banco.
//
// Uso: npx tsx prisma/seed-test-data.ts
//
// É seguro rodar mais de uma vez: pula pacientes/procedimentos cujo
// nome já existe na clínica, em vez de duplicar.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PATIENTS = [
  { name: "Ana Beatriz Souza", document: "111.222.333-01", phone: "71988001001", whatsapp: "71988001001", email: "ana.souza@example.com", birthDate: "1990-03-14", addressCity: "Santaluz", addressState: "BA" },
  { name: "Carlos Eduardo Lima", document: "111.222.333-02", phone: "71988001002", whatsapp: "71988001002", email: "carlos.lima@example.com", birthDate: "1985-07-22", addressCity: "Santaluz", addressState: "BA" },
  { name: "Fernanda Oliveira Costa", document: "111.222.333-03", phone: "71988001003", whatsapp: "71988001003", email: "fernanda.costa@example.com", birthDate: "1998-11-02", addressCity: "Conceição do Coité", addressState: "BA" },
  { name: "João Pedro Santos", document: "111.222.333-04", phone: "71988001004", whatsapp: "71988001004", email: "joao.santos@example.com", birthDate: "1976-01-30", addressCity: "Santaluz", addressState: "BA" },
  { name: "Juliana Almeida Rocha", document: "111.222.333-05", phone: "71988001005", whatsapp: "71988001005", email: "juliana.rocha@example.com", birthDate: "2001-05-19", addressCity: "Valente", addressState: "BA" },
  { name: "Marcos Vinícius Pereira", document: "111.222.333-06", phone: "71988001006", whatsapp: "71988001006", email: "marcos.pereira@example.com", birthDate: "1993-09-08", addressCity: "Santaluz", addressState: "BA" },
  { name: "Patrícia Gomes Ferreira", document: "111.222.333-07", phone: "71988001007", whatsapp: "71988001007", email: "patricia.ferreira@example.com", birthDate: "1988-12-25", addressCity: "Santaluz", addressState: "BA" },
  { name: "Rafael Henrique Silva", document: "111.222.333-08", phone: "71988001008", whatsapp: "71988001008", email: "rafael.silva@example.com", birthDate: "1970-04-11", addressCity: "Conceição do Coité", addressState: "BA" },
  { name: "Sabrina Cardoso Nunes", document: "111.222.333-09", phone: "71988001009", whatsapp: "71988001009", email: "sabrina.nunes@example.com", birthDate: "1995-06-17", addressCity: "Santaluz", addressState: "BA" },
  { name: "Thiago Barbosa Araújo", document: "111.222.333-10", phone: "71988001010", whatsapp: "71988001010", email: "thiago.araujo@example.com", birthDate: "1982-08-05", addressCity: "Valente", addressState: "BA" },
];

const TEST_PROCEDURES = [
  { name: "Consulta / Avaliação", category: "Diagnóstico", defaultPrice: 120 },
  { name: "Limpeza (Profilaxia)", category: "Prevenção", defaultPrice: 150 },
  { name: "Restauração em Resina", category: "Dentística", defaultPrice: 220 },
  { name: "Extração Simples", category: "Cirurgia", defaultPrice: 180 },
  { name: "Tratamento de Canal", category: "Endodontia", defaultPrice: 650 },
  { name: "Clareamento Dental", category: "Estética", defaultPrice: 800 },
  { name: "Manutenção de Aparelho Ortodôntico", category: "Ortodontia", defaultPrice: 180 },
  { name: "Implante Dentário", category: "Cirurgia", defaultPrice: 2500 },
  { name: "Prótese Total", category: "Prótese", defaultPrice: 1800 },
  { name: "Raspagem Periodontal", category: "Periodontia", defaultPrice: 300 },
];

async function main() {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!organization) {
    console.error("Nenhuma clínica encontrada no banco. Crie uma clínica primeiro em /onboarding.");
    process.exit(1);
  }

  console.log(`Populando dados de teste na clínica: ${organization.name}\n`);

  let createdPatients = 0;
  let skippedPatients = 0;
  for (const p of TEST_PATIENTS) {
    const existing = await prisma.patient.findFirst({
      where: { organizationId: organization.id, name: p.name },
    });
    if (existing) {
      skippedPatients++;
      continue;
    }
    await prisma.patient.create({
      data: {
        organizationId: organization.id,
        name: p.name,
        document: p.document,
        phone: p.phone,
        whatsapp: p.whatsapp,
        email: p.email,
        birthDate: new Date(p.birthDate),
        addressCity: p.addressCity,
        addressState: p.addressState,
      },
    });
    createdPatients++;
  }

  let createdProcedures = 0;
  let skippedProcedures = 0;
  for (const proc of TEST_PROCEDURES) {
    const existing = await prisma.procedure.findFirst({
      where: { organizationId: organization.id, name: proc.name },
    });
    if (existing) {
      skippedProcedures++;
      continue;
    }
    await prisma.procedure.create({
      data: {
        organizationId: organization.id,
        name: proc.name,
        category: proc.category,
        defaultPrice: proc.defaultPrice,
      },
    });
    createdProcedures++;
  }

  console.log(`Pacientes: ${createdPatients} criados, ${skippedPatients} já existiam.`);
  console.log(`Procedimentos: ${createdProcedures} criados, ${skippedProcedures} já existiam.`);
  console.log("\nPronto! Já dá pra testar agenda, orçamentos e financeiro com esses dados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

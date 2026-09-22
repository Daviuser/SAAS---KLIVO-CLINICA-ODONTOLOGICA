// Script de auditoria: confere se todos os arquivos que deveriam existir
// no projeto realmente estão lá. Não altera nada, só lista o que falta.
//
// Uso: node audit-files.js
// (rode na raiz do projeto, onde fica o package.json)

const fs = require("fs");
const path = require("path");

const EXPECTED_FILES = [
  "prisma/schema.prisma",
  "prisma/sync-permissions.ts",
  "prisma/rls/enable_rls.sql",
  "prisma/rls/enable_rls_agenda.sql",
  "prisma/rls/enable_rls_financial.sql",
  "prisma/rls/enable_rls_medical.sql",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/providers.tsx",
  "src/app/globals.css",
  "src/middleware.ts",
  "src/app/onboarding/page.tsx",
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/forgot-password/page.tsx",
  "src/app/(dashboard)/layout.tsx",
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/patients/page.tsx",
  "src/app/(dashboard)/patients/new/page.tsx",
  "src/app/(dashboard)/patients/[id]/layout.tsx",
  "src/app/(dashboard)/patients/[id]/page.tsx",
  "src/app/(dashboard)/patients/[id]/tabs.tsx",
  "src/app/(dashboard)/patients/[id]/prontuario/page.tsx",
  "src/app/(dashboard)/patients/[id]/odontograma/page.tsx",
  "src/app/(dashboard)/patients/[id]/orcamentos/page.tsx",
  "src/app/(dashboard)/agenda/page.tsx",
  "src/app/(dashboard)/procedures/page.tsx",
  "src/app/(dashboard)/financial/page.tsx",
  "src/app/(dashboard)/reports/page.tsx",
  "src/app/(dashboard)/settings/page.tsx",
  "src/app/print/prontuario/[id]/page.tsx",
  "src/app/print/orcamento/[id]/page.tsx",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/api/onboarding/route.ts",
  "src/app/api/patients/route.ts",
  "src/app/api/patients/[id]/route.ts",
  "src/app/api/patients/[id]/medical-record/route.ts",
  "src/app/api/patients/[id]/medical-record/entries/route.ts",
  "src/app/api/patients/[id]/odontogram/route.ts",
  "src/app/api/patients/[id]/budgets/route.ts",
  "src/app/api/budgets/[id]/route.ts",
  "src/app/api/procedures/route.ts",
  "src/app/api/procedures/[id]/route.ts",
  "src/app/api/financial/receivables/route.ts",
  "src/app/api/financial/receivables/[receivableId]/installments/[installmentId]/route.ts",
  "src/app/api/financial/payables/route.ts",
  "src/app/api/financial/payables/[id]/route.ts",
  "src/app/api/appointments/route.ts",
  "src/app/api/appointments/[id]/route.ts",
  "src/app/api/clinical-resources/route.ts",
  "src/app/api/clinical-resources/[id]/route.ts",
  "src/app/api/professionals/route.ts",
  "src/app/api/roles/route.ts",
  "src/app/api/users/route.ts",
  "src/app/api/users/[id]/route.ts",
  "src/app/api/reports/summary/route.ts",
  "src/components/auth/LoginVisual.tsx",
  "src/components/brand/Logo.tsx",
  "src/components/layout/AppShell.tsx",
  "src/components/layout/Sidebar.tsx",
  "src/components/layout/Topbar.tsx",
  "src/components/print/PrintButton.tsx",
  "src/lib/auth.ts",
  "src/lib/authorization.ts",
  "src/lib/brand.ts",
  "src/lib/permissions.ts",
  "src/lib/prisma.ts",
  "src/lib/tenant-context.ts",
  "src/lib/validation/appointment.ts",
  "src/lib/validation/budget.ts",
  "src/lib/validation/patient.ts",
  "src/lib/validation/procedure.ts",
  "src/lib/validation/user.ts",
];

let missingCount = 0;

console.log("Verificando arquivos...\n");

for (const relativePath of EXPECTED_FILES) {
  const fullPath = path.join(process.cwd(), relativePath);
  const exists = fs.existsSync(fullPath);
  if (!exists) {
    missingCount++;
    console.log(`❌ FALTANDO: ${relativePath}`);
  }
}

console.log("");
if (missingCount === 0) {
  console.log("✅ Tudo certo! Todos os arquivos esperados foram encontrados.");
} else {
  console.log(`⚠️  ${missingCount} arquivo(s) faltando. Copie a lista acima e me mande.`);
}

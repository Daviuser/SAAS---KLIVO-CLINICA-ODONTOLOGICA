-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "anamnesis" TEXT,
    "allergies" TEXT,
    "medications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tooth_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "toothNumber" TEXT NOT NULL,
    "condition" TEXT,
    "plannedProcedure" TEXT,
    "performedProcedure" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "tooth_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "defaultPrice" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "budgetId" TEXT,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_installments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "receivable_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalUserId" TEXT NOT NULL,
    "procedureId" TEXT,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalUserId" TEXT NOT NULL,
    "receivableInstallmentId" TEXT NOT NULL,
    "procedureId" TEXT,
    "percentageApplied" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_patientId_key" ON "medical_records"("patientId");

-- CreateIndex
CREATE INDEX "medical_records_organizationId_idx" ON "medical_records"("organizationId");

-- CreateIndex
CREATE INDEX "record_entries_organizationId_idx" ON "record_entries"("organizationId");

-- CreateIndex
CREATE INDEX "record_entries_medicalRecordId_idx" ON "record_entries"("medicalRecordId");

-- CreateIndex
CREATE INDEX "tooth_records_organizationId_idx" ON "tooth_records"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "tooth_records_patientId_toothNumber_key" ON "tooth_records"("patientId", "toothNumber");

-- CreateIndex
CREATE INDEX "procedures_organizationId_idx" ON "procedures"("organizationId");

-- CreateIndex
CREATE INDEX "budgets_organizationId_idx" ON "budgets"("organizationId");

-- CreateIndex
CREATE INDEX "budgets_patientId_idx" ON "budgets"("patientId");

-- CreateIndex
CREATE INDEX "budget_items_organizationId_idx" ON "budget_items"("organizationId");

-- CreateIndex
CREATE INDEX "budget_items_budgetId_idx" ON "budget_items"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "receivables_budgetId_key" ON "receivables"("budgetId");

-- CreateIndex
CREATE INDEX "receivables_organizationId_idx" ON "receivables"("organizationId");

-- CreateIndex
CREATE INDEX "receivables_patientId_idx" ON "receivables"("patientId");

-- CreateIndex
CREATE INDEX "receivable_installments_organizationId_idx" ON "receivable_installments"("organizationId");

-- CreateIndex
CREATE INDEX "receivable_installments_receivableId_idx" ON "receivable_installments"("receivableId");

-- CreateIndex
CREATE INDEX "payables_organizationId_idx" ON "payables"("organizationId");

-- CreateIndex
CREATE INDEX "commission_rules_organizationId_idx" ON "commission_rules"("organizationId");

-- CreateIndex
CREATE INDEX "commission_entries_organizationId_idx" ON "commission_entries"("organizationId");

-- CreateIndex
CREATE INDEX "commission_entries_professionalUserId_idx" ON "commission_entries"("professionalUserId");

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_records" ADD CONSTRAINT "tooth_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_installments" ADD CONSTRAINT "receivable_installments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_receivableInstallmentId_fkey" FOREIGN KEY ("receivableInstallmentId") REFERENCES "receivable_installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

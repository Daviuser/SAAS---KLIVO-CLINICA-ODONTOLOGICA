-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZipCode" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "patient_attachments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_attachments_organizationId_idx" ON "patient_attachments"("organizationId");

-- CreateIndex
CREATE INDEX "patient_attachments_patientId_idx" ON "patient_attachments"("patientId");

-- CreateIndex
CREATE INDEX "patients_organizationId_name_idx" ON "patients"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "patient_attachments" ADD CONSTRAINT "patient_attachments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

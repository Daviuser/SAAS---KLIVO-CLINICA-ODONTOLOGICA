/*
  Warnings:

  - A unique constraint covering the columns `[appointmentId]` on the table `receivables` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "receivables" ADD COLUMN     "appointmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "receivables_appointmentId_key" ON "receivables"("appointmentId");

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

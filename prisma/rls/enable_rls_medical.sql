-- ============================================================
-- RLS adicional — Prontuário e Odontograma
-- Rodar depois da migração que cria essas tabelas:
--   npx prisma db execute --file prisma/rls/enable_rls_medical.sql --schema prisma/schema.prisma
-- ============================================================

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_records   ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_medical_records ON medical_records
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_record_entries ON record_entries
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_tooth_records ON tooth_records
  USING (organization_id = current_setting('app.current_org_id', true));

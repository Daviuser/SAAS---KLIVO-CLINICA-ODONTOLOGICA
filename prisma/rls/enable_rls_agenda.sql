-- ============================================================
-- RLS adicional — Agenda
-- Rodar depois da migração que cria essas tabelas:
--   npx prisma db execute --file prisma/rls/enable_rls_agenda.sql --schema prisma/schema.prisma
-- ============================================================

ALTER TABLE clinical_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_clinical_resources ON clinical_resources
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_appointments ON appointments
  USING (organization_id = current_setting('app.current_org_id', true));

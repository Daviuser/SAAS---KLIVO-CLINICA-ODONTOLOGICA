-- ============================================================
-- ROW LEVEL SECURITY (RLS) — camada extra de isolamento multi-tenant
-- ============================================================
-- Mesmo que haja um bug na aplicação e uma query esqueça de filtrar
-- por organizationId, o próprio Postgres bloqueia o acesso a linhas
-- de outra organização.
--
-- Como rodar: depois de `npx prisma migrate dev`, execute este
-- arquivo com:
--   npx prisma db execute --file prisma/rls/enable_rls.sql --schema prisma/schema.prisma
--
-- IMPORTANTE: o usuário do banco usado pela aplicação (DATABASE_URL)
-- NÃO pode ser um superuser/owner da tabela para o RLS valer — donos
-- de tabela ignoram RLS por padrão. Se você criou o banco com um
-- usuário "postgres" padrão, crie um usuário de aplicação separado
-- (ver seção final deste arquivo).
-- ============================================================

-- Habilita RLS nas tabelas que guardam dado de tenant
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions    ENABLE ROW LEVEL SECURITY; -- via join com roles, ver política abaixo
ALTER TABLE patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

-- Política padrão: só enxerga (SELECT) e só modifica (INSERT/UPDATE/DELETE)
-- linhas cujo organization_id bate com a variável de sessão
-- "app.current_org_id", setada pela aplicação a cada requisição.

CREATE POLICY tenant_isolation_organizations ON organizations
  USING (id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_units ON units
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_users ON users
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_roles ON roles
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_patients ON patients
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_patient_attachments ON patient_attachments
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (organization_id = current_setting('app.current_org_id', true));

-- role_permissions não tem organization_id direto (é ligada por roleId);
-- a isolação dela já vem garantida indiretamente porque roles já é
-- filtrada por RLS, e todo JOIN respeita a política da tabela roles.
CREATE POLICY tenant_isolation_role_permissions ON role_permissions
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.id = role_permissions."roleId"
      AND roles.organization_id = current_setting('app.current_org_id', true)
    )
  );

-- ============================================================
-- Criando um usuário de aplicação SEM privilégio de owner
-- (necessário para o RLS realmente ser aplicado)
-- ============================================================
-- Rode isso manualmente uma vez, com um usuário admin do Postgres,
-- ajustando a senha e o nome do banco:
--
-- CREATE USER app_saas_clinica WITH PASSWORD 'troque-esta-senha';
-- GRANT CONNECT ON DATABASE saas_clinica TO app_saas_clinica;
-- GRANT USAGE ON SCHEMA public TO app_saas_clinica;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_saas_clinica;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_saas_clinica;
--
-- Depois, troque a DATABASE_URL do .env para usar esse usuário
-- (em vez do usuário owner/superuser criado por padrão pelo provedor).

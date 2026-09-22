-- ============================================================
-- RLS adicional — Procedimentos, Orçamentos, Financeiro, Comissões
-- Rodar depois da migração que cria essas tabelas:
--   npx prisma db execute --file prisma/rls/enable_rls_financial.sql --schema prisma/schema.prisma
-- ============================================================

ALTER TABLE procedures              ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables             ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables                ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_entries      ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_procedures ON procedures
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_budgets ON budgets
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_budget_items ON budget_items
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_receivables ON receivables
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_receivable_installments ON receivable_installments
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_payables ON payables
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_commission_rules ON commission_rules
  USING (organization_id = current_setting('app.current_org_id', true));

CREATE POLICY tenant_isolation_commission_entries ON commission_entries
  USING (organization_id = current_setting('app.current_org_id', true));

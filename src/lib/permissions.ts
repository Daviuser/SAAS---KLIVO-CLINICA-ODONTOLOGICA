// Catálogo central de permissões do sistema.
// Usado para popular a tabela `permissions` e para checagens no backend.

export const PERMISSIONS = {
  PATIENTS_READ: "patients:read",
  PATIENTS_WRITE: "patients:write",
  PATIENTS_DELETE: "patients:delete",

  AGENDA_READ: "agenda:read",
  AGENDA_WRITE: "agenda:write",
  // Permissão específica para CONCLUIR um atendimento (dispara geração
  // automática de recebimento + comissão). Separada de AGENDA_WRITE
  // porque agendar/remarcar/cancelar é uma coisa (recepção também faz),
  // concluir um atendimento clínico é outra (só quem atendeu ou admin).
  AGENDA_COMPLETE: "agenda:complete",

  RECORDS_READ: "records:read",
  RECORDS_WRITE: "records:write",

  ODONTOGRAM_READ: "odontogram:read",
  ODONTOGRAM_WRITE: "odontogram:write",

  PROCEDURES_READ: "procedures:read",
  PROCEDURES_WRITE: "procedures:write",

  BUDGETS_READ: "budgets:read",
  BUDGETS_WRITE: "budgets:write",

  FINANCIAL_READ: "financial:read",
  FINANCIAL_WRITE: "financial:write",

  COMMISSIONS_READ: "commissions:read",
  COMMISSIONS_WRITE: "commissions:write",

  REPORTS_READ: "reports:read",

  SETTINGS_WRITE: "settings:write",
  USERS_MANAGE: "users:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Papéis padrão criados automaticamente no onboarding de cada clínica,
// com o conjunto de permissões que cada um recebe por padrão.
// O Admin sempre recebe todas; os demais podem ser reconfigurados depois
// pela clínica (permissões granulares por papel).
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  Administrador: Object.values(PERMISSIONS),
  Gestor: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.AGENDA_READ,
    PERMISSIONS.AGENDA_WRITE,
    PERMISSIONS.PROCEDURES_READ,
    PERMISSIONS.PROCEDURES_WRITE,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.BUDGETS_WRITE,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.FINANCIAL_WRITE,
    PERMISSIONS.COMMISSIONS_READ,
    PERMISSIONS.COMMISSIONS_WRITE,
    PERMISSIONS.REPORTS_READ,
  ],
  Profissional: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.AGENDA_READ,
    PERMISSIONS.AGENDA_WRITE,
    PERMISSIONS.AGENDA_COMPLETE,
    PERMISSIONS.RECORDS_READ,
    PERMISSIONS.RECORDS_WRITE,
    PERMISSIONS.ODONTOGRAM_READ,
    PERMISSIONS.ODONTOGRAM_WRITE,
    PERMISSIONS.PROCEDURES_READ,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.COMMISSIONS_READ,
  ],
  Recepcionista: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.AGENDA_READ,
    PERMISSIONS.AGENDA_WRITE,
    PERMISSIONS.PROCEDURES_READ,
    PERMISSIONS.BUDGETS_READ,
    PERMISSIONS.BUDGETS_WRITE,
  ],
  Financeiro: [
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.FINANCIAL_WRITE,
    PERMISSIONS.COMMISSIONS_READ,
    PERMISSIONS.COMMISSIONS_WRITE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.PROCEDURES_READ,
  ],
};

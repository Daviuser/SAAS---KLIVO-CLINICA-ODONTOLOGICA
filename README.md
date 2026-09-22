# SaaS de Gestão para Clínicas Odontológicas

## O que está pronto

### Fase 1 — Fundação
- Projeto Next.js 14 (App Router) + TypeScript + Tailwind
- Schema Prisma do núcleo: `Organization`, `Unit`, `User`, `Role`, `Permission`,
  `RolePermission`, `AuditLog`
- Autenticação (NextAuth, Credentials Provider) com sessão contendo
  `organizationId`, `roleId` e `roleName`
- Middleware protegendo rotas internas
- Fluxo de **onboarding** (rota pública `/onboarding`): cria a clínica, a
  unidade padrão, os 5 papéis com permissões pré-configuradas e o
  primeiro usuário Admin — tudo em uma transação
- Tela de login

### Fase 2 — Pacientes + RLS + Prontuário + Odontograma
- **Cadastro completo de paciente**: dados pessoais, endereço, contato de
  emergência, observações (model `Patient` + `PatientAttachment` para
  anexos futuros)
- **CRUD de pacientes** com checagem de permissão e soft delete (paciente
  nunca é apagado fisicamente — só marcado `active: false`)
- **Row Level Security (RLS)** ativado no Postgres como camada extra de
  isolamento entre clínicas, além do filtro por `organizationId` na
  aplicação (helper `withTenantContext`)
- **Prontuário eletrônico**: dados de cabeceira (anamnese, alergias,
  medicações) editáveis, e histórico clínico (`RecordEntry`) **imutável**
  — nunca editado/apagado depois de criado
- **Odontograma interativo**: os 32 dentes (notação FDI), clicáveis, com
  condição, tratamento planejado/realizado e observação por dente
- **Impressão do prontuário** (`/print/prontuario/[id]`, botão "Imprimir
  prontuário" na aba): documento limpo (sem menu/sidebar) com dados do
  paciente, anamnese, alterações do odontograma, histórico clínico
  completo e campo de assinatura — abre numa aba nova e usa a função de
  imprimir do próprio navegador (funciona também como "salvar como PDF")
- Toda escrita relevante gera registro em `AuditLog`

### Fase 3 — Procedimentos, Orçamentos e Financeiro
- **Catálogo de procedimentos** (`/procedures`): nome, categoria, valor padrão
- **Orçamentos** (aba "Orçamentos" na ficha do paciente): monta itens a
  partir do catálogo, com quantidade e desconto; fluxo de status
  draft → sent → approved/rejected
- **Orçamento é só proposta — não gera cobrança.** Aprovar um orçamento
  muda o status, ponto. O orçamento vira um **PDF pra mandar ao
  paciente** (`/print/orcamento/[id]`, botão "Imprimir / PDF"), com os
  itens, total, e duas opções de pagamento mostradas (à vista e cartão de
  crédito — parcelamento no cartão é combinado direto na maquininha da
  clínica, o sistema não controla isso). A cobrança de verdade só nasce
  quando a consulta correspondente é **concluída na Agenda** (ver Fase 4
  abaixo) — assim não tem risco de cobrar o paciente duas vezes (uma
  pelo orçamento, outra pela consulta).
- **Financeiro** (`/financial`): contas a receber (com baixa de parcela
  por parcela), contas a pagar (lançamento manual + marcar como pago),
  resumo consolidado (a receber / recebido / a pagar)
- **Comissões**: `CommissionRule` e `CommissionEntry` (lançamento gerado
  automaticamente quando uma parcela é paga), agora com **tela própria**
  em `/commissions`:
  - **Extrato**: o profissional logado vê só as próprias comissões (por
    paciente e procedimento, com filtro de período); Admin/Gestor/
    Financeiro veem de todos os profissionais, com filtro por pessoa
  - **Configurar regras** (só Admin/Gestor/Financeiro): percentual por
    profissional, geral ou específico por procedimento — regra
    específica tem prioridade sobre a geral quando as duas existem pro
    mesmo profissional

**Simplificação conhecida:** a comissão usa a regra "geral" do
profissional (sem procedimento específico). Se a clínica precisar de
comissão por procedimento com precisão total, isso pede um redesenho.

### Fase 4 — Agenda
- **Salas/cadeiras** (`ClinicalResource`) e **profissionais** (usuários
  com papel Profissional) selecionáveis ao agendar
- **Tela de Agenda** (`/agenda`): visão diária, navegação entre dias,
  criação de consulta (busca de paciente, profissional, sala/cadeira,
  procedimento opcional, horário e duração) e troca de status
  (agendada → confirmada → em atendimento → concluída / cancelada / faltou)
- **Checagem de conflito de horário**: não deixa marcar duas consultas
  no mesmo horário para o mesmo profissional ou a mesma sala/cadeira
- **Dashboard com dados reais**: consultas de hoje, faturamento do mês,
  novos pacientes no mês e contas a receber vêm do banco; "Próximos
  atendimentos" puxa da agenda de verdade
- **Visual em grade por horário** (estilo Google Calendar): coluna de
  horas à esquerda, uma coluna por profissional quando "Todos" está
  selecionado, blocos de consulta coloridos por status
- **Filtro por profissional**: ver a agenda de um dentista específico
  ou de todos ao mesmo tempo
- **Visão semanal**: 7 dias lado a lado com lista compacta por dia;
  clicar num dia abre a visão diária daquele dia
- **Detalhe rápido ao clicar numa consulta**: modal com paciente,
  procedimento, sala/cadeira, contato, observações e troca de status
  sem precisar abrir outra tela — com atalho direto pra ficha do
  paciente
- **Seleção de horário e duração em grade de slots clicáveis** (em vez
  do spinner nativo do navegador): horários já ocupados do profissional
  selecionado naquele dia aparecem desabilitados na grade, então dá pra
  ver de cara o que está livre antes mesmo de tentar salvar
- **Integração automática com o financeiro**: ao marcar uma consulta
  como **concluída**, se ela tem um procedimento vinculado e ainda não
  gerou cobrança, o sistema cria sozinho uma conta a receber (1 parcela,
  vencimento no dia, valor = preço padrão do procedimento). Isso aparece
  na hora em `/financial`, em `/reports` e nos KPIs do dashboard. A
  consulta sem procedimento definido não gera cobrança nenhuma — o
  campo é opcional na Agenda, mas é obrigatório se quiser esse
  comportamento automático. Se o dentista da consulta tiver uma regra de
  comissão geral cadastrada, ela também é aplicada quando a parcela for
  paga (mesmo mecanismo do fluxo de orçamento).

### Fase 5 (em andamento) — Configurações, impressão, relatórios
- **Tela de Configurações** (`/settings`): gerenciamento de salas e
  cadeiras (cadastrar, desativar, reativar) — antes só dava pra fazer
  isso via Prisma Studio
- A tela de novo agendamento agora avisa e linka direto pra cá quando
  não há sala/cadeira ou profissional cadastrado
- **Impressão de prontuário e orçamento** (`/print/prontuario/[id]`,
  `/print/orcamento/[id]`): documentos formatados, sem menu/sidebar,
  usando a função de imprimir do navegador (funciona como "salvar como
  PDF")
- **Cadastro de usuários** (`/settings` → aba "Usuários"): cadastrar
  dentistas, recepcionistas etc. com nome, e-mail, senha provisória e
  papel; trocar o papel de um usuário existente; ativar/desativar acesso
  — antes só existia o Admin criado no onboarding, sem forma de
  adicionar mais gente
- **Relatórios** (`/reports`): faturamento por período (com gráfico de
  barras simples), produção por profissional, e lista de parcelas
  vencidas (inadimplência) com total
- ⚠️ **Permissões granulares desligadas temporariamente** a pedido —
  hoje qualquer usuário logado pode fazer qualquer ação dentro da
  própria clínica, independente do papel. Ver comentário em
  `src/lib/authorization.ts` (`PERMISSION_CHECKS_ENABLED`) para
  reativar antes de testar com múltiplos papéis ou vender pra clínica
  real.

## Como rodar localmente (projeto novo, do zero)

Pré-requisitos: Node.js 18+, PostgreSQL rodando (local ou em nuvem).

```bash
npm install
cp .env.example .env
# edite .env com sua DATABASE_URL real e gere o NEXTAUTH_SECRET

npx prisma migrate dev --name init

npx prisma db execute --file prisma/rls/enable_rls.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/rls/enable_rls_medical.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/rls/enable_rls_financial.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/rls/enable_rls_agenda.sql --schema prisma/schema.prisma

npm run dev
```

Acesse `http://localhost:3000/onboarding` para criar a clínica e o
usuário Admin.

## Atualizando um projeto já existente para a fase mais recente

```bash
npx prisma migrate dev --name add_agenda
npx prisma db execute --file prisma/rls/enable_rls_agenda.sql --schema prisma/schema.prisma
npm run sync:permissions
npm run dev
```

E para a integração Agenda → Financeiro (conta a receber automática ao
concluir consulta):

```bash
npx prisma migrate dev --name link_appointment_receivable
```

O `sync:permissions` garante que clínicas criadas antes desta fase
recebam as permissões novas nos papéis padrão, sem perder nenhuma
permissão customizada que a clínica já tenha alterado manualmente.

Antes de agendar a primeira consulta, cadastre ao menos uma sala/cadeira
em **Configurações → Salas e cadeiras** e verifique se existe um usuário
com papel "Profissional" na clínica — sem isso, os seletores da tela de
Agenda ficam vazios.

**Sobre o RLS:** para ele funcionar de verdade, o usuário do Postgres
usado na `DATABASE_URL` não pode ser o dono/superuser das tabelas (donos
ignoram RLS por padrão). O arquivo `prisma/rls/enable_rls.sql` tem, no
final, o SQL comentado para criar um usuário de aplicação restrito.

## Pendências conhecidas
- **Anexos de paciente**: o model `PatientAttachment` guarda só a
  referência (`fileUrl`); falta configurar um storage real (S3,
  Cloudflare R2 etc.)
- **Recuperação de senha**: a tela existe, mas o envio de e-mail com
  token de reset não está implementado (depende de escolher um provedor)

## Próximos passos
- WhatsApp, IA, pagamentos online, multi-unidade (conforme escopo original)
#   S A A S - - - K L I V O - C L I N I C A - O D O N T O L O G I C A  
 
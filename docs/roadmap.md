# Roadmap — paridade de funcionalidade com o Trinks

Objetivo: TotalAgenda como alternativa ao Trinks — agenda + gestão white-label para o
estabelecimento **e** marketplace central de descoberta para o consumidor final.
**Sem integração de pagamento nesta fase** (PDV registra formas de pagamento e valores,
mas não processa transação; PSP fica para depois).

Cada milestone é entregável sozinho: schema + migração + backend + frontend + testes
unitários + seed atualizado, build (`turbo run build`) e `turbo run test` verdes.

## Progresso

- **M0 — concluída.** `Appointment`/`AppointmentItem`, migração com backfill, `RECEPTIONIST`,
  transições de status, criação por staff, `/appointments/*`.
- **M1 — concluída.** `GET /appointments/calendar` + tela `/dashboard/agenda` (grade dia
  por profissional, criar por slot, painel lateral com status/remarcar/cancelar, filtro).
  _Deferido:_ arrastar/redimensionar direto na grade (hoje remarca pelo painel) e visão
  semana — não bloqueiam o uso.
- **M2 — concluída.** `Client` rico + CRUD + timeline; `IntakeForm`/`IntakeResponse` +
  telas `/dashboard/clientes` e `/dashboard/fichas`.
  _Deferido:_ pacotes/assinaturas de serviço (`ServicePackage`/`ClientPackage`) e o
  relatório de aniversariantes/sem-retorno — movidos para um "M2.1" ou para a M3.

## Estado inicial (antes da M0)

Já existe: perfil público do tenant, wizard de agendamento público, lista de espera,
CRUD de profissionais/serviços/horários, bloqueios de horário, auth staff + cliente,
espelho de billing. `Booking` = 1 serviço por agendamento.

## M0 — Fundação: agregado `Appointment` + recepção

Refactor que todo o resto depende. Fazer e **revisar antes** de construir M1–M5 em cima.

- `Booking` → `Appointment` (agregado) + `AppointmentItem` (linha: serviço, profissional,
  snapshot de preço/duração, ordem). Um atendimento pode ter N serviços.
- Migração com backfill: cada `Booking` vira 1 `Appointment` + 1 `AppointmentItem`.
- `AppointmentStatus`: `SCHEDULED` → `CONFIRMED` → `IN_SERVICE` → `COMPLETED`;
  `NO_SHOW`, `CANCELED`. Transições validadas no service.
- `Role.RECEPTIONIST`: enxerga agenda de todos os profissionais, cria/edita atendimento,
  não mexe em billing/config.
- Endpoint de criação manual pela recepção (walk-in): cliente opcional / cadastro rápido.
- Anti-overlap continua por `EXCLUDE` + advisory lock, agora no nível do item.
- `manageToken` continua no `Appointment`.

## M1 — Agenda Pro

- Endpoints de calendário: intervalo dia/semana, agrupado por profissional, com blocos,
  atendimentos e horários de trabalho num payload só.
- Reagendar = mover/redimensionar (drag/resize no front → PATCH start/professional).
- Tela de agenda no dashboard: grade dia/semana por coluna de profissional, arrastar e
  redimensionar, criar atendimento clicando num slot vazio, painel lateral do atendimento
  (status, itens, cliente, ações).
- Cadastro rápido de cliente inline.
- Filtro por profissional / serviço.

## M2 — Cliente 360

- `Client` rico: e-mail, `birthDate`, CPF opcional, `notes`, `tags[]`, origem.
- Timeline de atendimentos do cliente (histórico + futuros + no-shows).
- Anamnese: `IntakeForm` (schema de campos em JSON por tenant) + `IntakeResponse` por
  cliente/atendimento.
- Pacotes e assinaturas de serviço (`ServicePackage`, `ClientPackage` com saldo de
  sessões) — consumidos ao fechar atendimento.
- Aniversariantes do mês / clientes sem retorno há N dias (base para marketing depois).

## M3 — Comanda + PDV + Estoque + Comissão

- `Product` + `StockMovement` (entrada, saída, ajuste, venda) — saldo derivado.
- `AppointmentItem` passa a aceitar `productId` além de `serviceId`.
- `Ticket` (comanda) por atendimento ou avulsa: itens + descontos + `Payment[]`
  (`PaymentMethod` enum: dinheiro, débito, crédito, pix, outros — só registro).
- `CashRegister` (sessão de caixa): abrir com fundo de troco, sangria/suprimento, fechar
  com conferência; relatório de fechamento.
- `CommissionRule` por profissional (× serviço/produto/categoria, % ou fixo) +
  `CommissionEntry` gerada ao fechar comanda; relatório por profissional/período.

## M4 — Financeiro

- `FinancialCategory` (receita/despesa, árvore).
- `FinancialEntry` / lançamentos: receitas vindas de comanda + despesas manuais,
  contas a pagar/receber com vencimento e baixa.
- Fluxo de caixa por período, DRE simples (receita − custo − despesa), previsto × realizado.
- Dashboard financeiro no painel do dono.

## M5 — Marketplace de descoberta

- `Consumer` — identidade **global** (não escopada por tenant), login próprio; `Client`
  por tenant vira um vínculo `ConsumerTenantLink`. LGPD: base própria, consentimento,
  export/delete.
- Estabelecimento: `latitude`/`longitude`, `ServiceCategory[]`, cidade/bairro, faixa de
  preço; opt-in de listagem no marketplace.
- Busca: por cidade/bairro/categoria/serviço + ordenação por distância (bounding box no
  Postgres; PostGIS só se precisar de raio real).
- `Review` (nota + texto) atrelada a `Appointment` concluído; moderação básica
  (denúncia, ocultar); média e contagem no perfil.
- Portal central com nossa marca: `/descobrir`, `/estabelecimento/[slug]`, agendamento
  ponta-a-ponta pelo portal (reusa wizard, identidade = `Consumer`).
- SEO: SSR + sitemap + dados estruturados dos estabelecimentos listados.

## Transversal (fora de milestone, conforme necessário)

- Notificações: infra de envio (WhatsApp/SMS/e-mail) com fila e templates; lembrete de
  atendimento, confirmação, pesquisa pós-atendimento.
- RBAC: refinar permissões por role à medida que telas de gestão crescem.
- Relatórios: exportação CSV, agendados por período.
- Identidade visual: pass de design próprio (não copiar layout do Trinks — só paridade
  de função).

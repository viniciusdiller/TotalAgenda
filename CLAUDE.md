# TotalAgenda

SaaS multi-tenant de agendamento e gestão para salões, barbearias e prestadores de
serviço por horário. Cada negócio (tenant) tem página pública própria em `/[slug]` +
painel de gestão em `/dashboard`. Concorrente direto do Trinks — ver
[docs/roadmap.md](docs/roadmap.md) para o plano de paridade de funcionalidade.

## Stack

| Camada    | Tecnologia |
|-----------|------------|
| Monorepo  | pnpm workspaces + Turborepo (`turbo.json`) |
| Backend   | NestJS 10 (`apps/backend`), Express, Passport JWT, class-validator, Luxon |
| Frontend  | Next.js 16 (App Router, Turbopack) + React 19 (`apps/frontend`), Tailwind v4, NextAuth v5 beta, Zod |
| DB        | PostgreSQL 16 + Prisma 5 (`packages/database`) |
| Tipos     | `@totalagenda/shared-types` (contrato compartilhado front/back) |

> `apps/frontend/AGENTS.md`: esta versão do Next tem breaking changes — consultar
> `node_modules/next/dist/docs/` antes de escrever código de frontend.

## Rodando local

```bash
docker compose up -d                    # Postgres em localhost:5432
pnpm install
pnpm --filter @totalagenda/database db:migrate
pnpm --filter @totalagenda/database db:seed
pnpm dev                                # backend :3001, frontend :3000
```

`.env` obrigatório em `apps/backend/` e `packages/database/` (ver `DATABASE_URL`,
`JWT_SECRET`, `TOTALAGENDA_WEBHOOK_SECRET` em `apps/backend/src/config/env.validation.ts`).
**Nunca commitar `.env*`** — regra absoluta do repo.

## Arquitetura

### Multi-tenancy
Isolamento por `tenantId` em toda entidade. O `tenantId` do usuário autenticado vem do
JWT (`AuthenticatedUser`), nunca do body/query. Queries de escrita/leitura de recurso de
tenant sempre filtram por `tenantId` na cláusula `WHERE` — não "buscar e comparar dono
depois" (evita janela de IDOR).

### Autenticação — dois domínios distintos
- **Staff** (`User`, roles `OWNER` / `PROFESSIONAL` / `RECEPTIONIST`): login e-mail+senha,
  JWT via `AuthModule`. Guards globais: `JwtAuthGuard` → `RolesGuard` → `TenantBillingGuard`
  (`app.module.ts`). `@Public()` libera rota; `@Roles()` restringe.
- **Cliente final** (`Client`, escopado por tenant, identidade por telefone normalizado):
  login só-telefone sem OTP (v1), JWT próprio via `ClientAuthModule` / `ClientJwtAuthGuard`.
  O primeiro agendamento cria a conta (`ClientsService.upsertForBooking`).

### Billing
Cobrança real (Stripe, checkout, ciclo) vive no **Admin-TotalSoftware**, repositório
externo. Este backend só mantém um espelho (`Plan` / `Subscription`) atualizado por
webhooks (`src/webhooks`, autenticados por `WebhookSecretGuard` com segredo compartilhado)
para aplicar limites de plano (`PlanLimitService`) e liberar/bloquear acesso
(`TenantBillingGuard`). Tenants trial nascem via cadastro local.

### Agendamento
- `Appointment` é o agregado (um "atendimento"/comanda), com `AppointmentItem[]`
  (serviços e, futuramente, produtos). Snapshot de preço/duração no item no momento da
  marcação — auditoria, não re-lê catálogo depois.
- Anti-overlap: constraint `EXCLUDE` (GiST) na migration SQL **+** checagem defensiva em
  `assertNoConflict` dentro de `$transaction` com `pg_advisory_xact_lock` por profissional.
- Timezone: America/Sao_Paulo assumido; datas trafegam ISO-8601, cálculo com Luxon.
- `manageToken` (nanoid) dá acesso não-autenticado ao gerenciamento de um agendamento
  específico (link enviado ao cliente).

### Uploads
Arquivos de tenant (logo, galeria) em `apps/backend/uploads/` (gitignored), servidos por
`ServeStaticModule`. Nome de arquivo fixo por tenant + cache-bust por `updatedAt` na URL.

## Segurança (não-negociável)

Segurança é o requisito nº 1 — validação e tratamento de erro em boundary (API/DB/auth)
nunca são cortados por simplicidade. Ao escrever ou revisar código, varrer ativamente por:

### IDOR / BOLA (Broken Object Level Authorization)
- **Toda** query de recurso de tenant filtra por `tenantId` (do JWT) na cláusula `WHERE` —
  `findFirst({ where: { id, tenantId } })`, nunca `findUnique({ where: { id } })` seguido de
  comparação de dono em JS (isso abre janela de IDOR e vaza existência do recurso).
- Recurso de cliente logado: filtrar por `clientId` na query (`where: { id, tenantId, clientId }`).
- `PROFESSIONAL` só acessa a própria agenda: o service injeta `professionalId` no `WHERE`
  quando `role === PROFESSIONAL` (ver `AppointmentsService.findOwnedByStaff`).
- Nunca aceitar `tenantId` / `professionalId` "de dono" vindo do body/query como fonte de
  autorização — só como filtro adicional, sempre cruzado com o JWT.
- `manageToken` (nanoid 24) é capability aleatória e não-enumerável para o fluxo público
  sem login — não substituível por `id` sequencial/uuid exposto.

### Injeção SQL / NoSQL
- Acesso a dados **só** via Prisma Client (parametrizado). `$queryRaw` / `$executeRaw`
  apenas com template tag (`$executeRaw\`... ${x}\``), nunca `$queryRawUnsafe` com
  concatenação de input. O único raw hoje é `pg_advisory_xact_lock(hashtext(${id}))` —
  interpolação por parâmetro, não string.
- `ValidationPipe` global com `whitelist: true` + `forbidNonWhitelisted: true`: campo não
  declarado no DTO → 400. Todo input de fronteira passa por DTO com class-validator.

### DoS / abuso
- `ThrottlerModule` global (100 req/min por IP). Rotas públicas sensíveis a spam têm
  `@Throttle` mais estrito (ex.: criação de agendamento público: 10/min).
- Constraint `EXCLUDE` + advisory lock evitam corrida de double-booking sob carga.
- Uploads: limite de tamanho e content-type no Multer; imagens reprocessadas com `sharp`
  (descarta payload malicioso embutido). Sem upload de SVG (XSS via `<script>` em SVG).
- Paginação/limite em toda listagem que possa crescer sem teto (adicionar ao criar
  endpoints de histórico/relatório).

### Auth / sessão
- Senhas com bcrypt (rounds 12). Nunca logar senha, token, hash ou `Authorization`.
- JWT: validar assinatura + expiração (`passport-jwt`); `JWT_SECRET` obrigatório no
  `env.validation` (fail closed). Não confiar em claim sem revalidar o recurso no banco.
- Webhooks do Admin-TotalSoftware: `WebhookSecretGuard` com segredo compartilhado,
  comparação em tempo constante; sem segredo configurado → rejeita tudo.
- Token de "definir senha": só o **hash** é persistido, com expiração; consumido uma vez.

### Exposição de dados sensíveis
- Mensagem de erro ao usuário é genérica em pt-BR; stack trace e detalhe de Prisma nunca
  vazam (`PrismaExceptionFilter` normaliza). Recurso inexistente e recurso de outro tenant
  retornam o **mesmo** 404 (não confirmar existência).
- `select` explícito ao devolver `User` / `Client` — nunca serializar `passwordHash`,
  `passwordSetTokenHash`, tokens.
- **Nunca** commitar `.env*` / segredos (regra absoluta — ver
  `Vscode/CLAUDE.md`). `.env.example` versionado sem valores reais.

### SSRF / deserialização / dependências
- Sem fetch de URL controlada por usuário no servidor (se surgir — ex.: importar imagem
  por URL — validar host contra allowlist, bloquear IP privado/metadata).
- Sem `eval` / deserialização de payload arbitrário. JSON via parser padrão.
- `pnpm audit` no CI; dependência com CVE conhecido bloqueia merge.

## Convenções

### Backend
- Um módulo Nest por domínio: `<dominio>.module.ts` / `.service.ts` / `.controller.ts` /
  `dto/*.dto.ts`. Múltiplos controllers no mesmo arquivo quando compartilham domínio
  (público vs. admin vs. cliente — ver `bookings.controller.ts`).
- DTOs com class-validator; `ValidationPipe` global é `whitelist + forbidNonWhitelisted`.
- Dinheiro sempre em **centavos** (`Int`), nunca float. Sufixo `Cents`.
- Duração sempre em **minutos** (`Int`). Horário do dia como minutos desde meia-noite
  (`startMinute` / `endMinute`).
- Erros de domínio: exceptions do Nest (`NotFoundException`, `ConflictException`, ...) com
  mensagem em português voltada ao usuário final. `PrismaExceptionFilter` traduz erros do
  Prisma.
- Serviços que participam de transação de agendamento aceitam
  `Prisma.TransactionClient | PrismaService` como primeiro parâmetro.

### Frontend
- Server Components por padrão; `"use client"` só quando necessário. Mutações via Server
  Actions (`actions.ts` por rota), não chamada client→backend (exceto wizard público que
  bate em `/public/*`).
- `lib/api.ts` = cliente dos endpoints `/public/*` (sem auth). `lib/api-server.ts`
  (`authedFetch`) = chamadas autenticadas server-side com o JWT da sessão.
- Cor de destaque: token `--color-accent-*` em `globals.css`; tenant pode sobrescrever com
  `accentColor` (aplicado como CSS var `--tenant-accent` no layout de `/[slug]`).
- Ícones: `@phosphor-icons/react` (usar o import `/dist/ssr` em Server Components).

### Testes
- Backend: `*.spec.ts` ao lado do arquivo, `jest` + `ts-jest`. Services testados com
  Prisma mockado (unit) — ver `bookings.service.spec.ts`, `availability.service.spec.ts`.
- Regra do projeto: validação de segurança, tratamento de erro em boundary e casos
  críticos **têm** teste — não são cortados por "simplicidade".

### Git
- Branch dedicada por feature/fix (`feat/...`, `fix/...`), nunca commit direto em `main`.
- Commits segmentados por unidade lógica; cada um compila/passa sozinho; mensagem explica
  o "porquê".

## Layout do monorepo

```
apps/
  backend/    NestJS — API REST (:3001)
  frontend/   Next.js — página pública + dashboard (:3000)
packages/
  database/   schema Prisma, migrations, seed, client gerado
  shared-types/  contrato de tipos front/back
docs/
  roadmap.md  plano de paridade com o Trinks (milestones M0–M5)
```

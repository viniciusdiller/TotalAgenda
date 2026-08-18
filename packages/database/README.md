# @totalagenda/database

Pacote compartilhado de persistência do TotalAgenda, responsável pelo schema, migrations, seed e Prisma Client.

## Configuração local

A partir da raiz do monorepo, copie o ambiente de exemplo e inicie um PostgreSQL local compatível com os valores padrão do projeto:

```bash
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

`DATABASE_URL` continua sendo a configuração prioritária. O script do Studio possui um fallback apenas para desenvolvimento local, com a mesma URL usada pelo serviço PostgreSQL do Docker.

## Prisma Studio

Execute a partir da raiz:

```bash
pnpm db:studio
```

Ou diretamente neste pacote:

```bash
pnpm --filter @totalagenda/database db:studio
```

O script passa explicitamente `--schema` e `--url`, evitando o erro `No database URL found` quando o shell não carregou `DATABASE_URL`. Em produção ou ambientes compartilhados, defina sempre uma URL real por variável de ambiente; o fallback não substitui configuração de deploy.

## Scripts

| Comando | Finalidade |
|---|---|
| `pnpm db:generate` | Gera o Prisma Client. |
| `pnpm db:migrate` | Cria e aplica migrations em desenvolvimento. |
| `pnpm db:deploy` | Aplica migrations versionadas em deploy. |
| `pnpm db:seed` | Popula o banco com dados iniciais. |
| `pnpm db:studio` | Abre o Prisma Studio com schema e URL explícitos. |

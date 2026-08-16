# Gestão de Temporada

SaaS de gestão imobiliária para locação **de curta temporada** (Airbnb) e **de longa duração** (contratos residenciais/comerciais), com contabilidade em plano de contas e relatórios fiscais brasileiros.

O histórico funcional completo está em [todo.md](todo.md).

## Stack

- **Front**: React 19 + Vite 7, wouter (rotas), TanStack Query, shadcn/ui + Tailwind 4, react-hook-form + zod
- **Back**: Express 4 + tRPC 11, Drizzle ORM sobre MySQL (`mysql2`)
- **Infra**: Cloudflare R2 para documentos, JWT em cookie para sessão
- **Gerenciador de pacotes**: pnpm (há um patch em `patches/wouter@3.7.1.patch`)

## Comandos

```bash
pnpm test          # vitest run — 15 testes (fiscal, DRE, auth)
pnpm check         # tsc --noEmit
pnpm db:push       # drizzle-kit generate && migrate (exige DATABASE_URL)
```

No Windows, `pnpm dev` falha: o script usa o prefixo POSIX `NODE_ENV=development`. Suba o servidor pelo `preview_start` com a configuração `dev` do [.claude/launch.json](.claude/launch.json), que chama o `tsx` diretamente na porta 3000.

**Não rode `pnpm format`.** O código não está formatado segundo o `.prettierrc` (o `printWidth: 80` é violado em quase todo arquivo), então rodá-lo reformataria o repositório inteiro e afogaria qualquer diff real.

## Ambiente

Copie [.env.example](.env.example) para `.env`. São necessários `DATABASE_URL`, `JWT_SECRET` e `VITE_APP_ID` — R2 e NFS-e falham apenas no momento em que são usados.

`VITE_APP_ID` não é opcional apesar do nome sugerir plataforma: `verifySession` em [server/_core/sdk.ts](server/_core/sdk.ts) exige `appId` não vazio no token. Com ele em branco o login responde 200 e grava o cookie, mas toda requisição seguinte volta anônima — a tela de login parece simplesmente não reagir.

### Migrações

`drizzle-kit migrate` separa os statements de cada `.sql` pelo marcador `--> statement-breakpoint`. Sem ele, o arquivo inteiro vai como uma query só e o MySQL rejeita com `ER_PARSE_ERROR`, porque múltiplos statements por query são desabilitados por padrão. Migrações escritas à mão precisam do marcador entre cada statement — as de 0025 a 0030 foram criadas sem ele e só falharam quando alguém aplicou a partir do zero.

## Arquitetura

```
drizzle/schema.ts       15 tabelas + tipos Insert*; fonte única do schema
drizzle/00XX_*.sql      migrações versionadas (33 até agora)
server/routers.ts       appRouter tRPC inteiro (~1700 linhas), um sub-router por domínio
server/db.ts            todos os helpers de acesso a dados, sempre escopados por userId
server/fiscal.ts        motor fiscal: CBS/IBS, redutor de 40%, dupla nota (locação + comissão)
server/storage.ts       upload/assinatura de URLs no R2
server/_core/           infra da plataforma Manus — evite editar
client/src/pages/       uma página por rota; 27 rotas em App.tsx
client/src/components/DashboardLayout.tsx   menu lateral (array NAV_ITEMS no topo)
```

### Convenções

- **Idioma**: schema, rotas tRPC e nomes de arquivo em português; o código de infra em `_core/` é inglês. Mensagens de commit em português.
- **Procedures**: `publicProcedure`, `protectedProcedure` (exige sessão) e `adminProcedure`, de `server/_core/trpc.ts`. Quase tudo é `protectedProcedure`.
- **Isolamento por usuário**: toda query em `db.ts` filtra por `userId`. Ao adicionar um helper novo, mantenha isso — é o que separa os dados entre contas.
- **Documentos e CPF/CNPJ** são gravados só com dígitos (`.replace(/\D/g, "")`); a máscara é responsabilidade do front.

### Pontos que exigem cuidado

**Lançamentos automáticos no razão.** Receitas de reservas e de parcelas de contrato, e a despesa de faxina por reserva, entram em `ledger_entries` automaticamente, vinculadas à origem (`reservationId` / `contractRentChargeId`). As telas de Receitas/Despesas/Aportes mostram e editam **apenas lançamentos manuais**, e o servidor bloqueia editar ou excluir um automático por essas rotas. Alterar um lançamento automático deve sempre partir da reserva ou da parcela de origem, senão os dois lados dessincronizam.

**Perfis de usuário** (`client/src/lib/userTypes.ts`): `holding`, `administradora`, `gestor_temporada_pj` (PJ) e `proprietario`, `admin_airbnb` (PF). O perfil altera o que aparece — `holding`, por exemplo, não vê Clientes nem Repasse ao Proprietário. Ao adicionar tela nova, decida o `hideFor` dela.

**Categoria fiscal fica no cliente, não no usuário.** `clients.fiscalCategory` (PJ / PF com CBS-IBS / PF isento) é o que decide se e como a NFS-e é emitida. Não use o perfil do usuário logado para isso.

**Emissão de NFS-e é simulada** enquanto `NFSE_PROVIDER_URL` não estiver configurado: os dois payloads (locação e comissão) são gerados e persistidos em `invoices`, mas nada é transmitido. Reserva com nota emitida trava a edição dos campos fiscais.

**Importação de CSV do Airbnb** aceita planilhas em português e com várias unidades por arquivo, e deduplica pelo código da reserva — cuidado ao mexer, já houve regressão de datas com 1 dia de defasagem e de lançamentos duplicados.

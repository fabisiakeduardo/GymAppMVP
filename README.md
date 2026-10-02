# Maromba — Logbook de Treino (MVP)

App de **logbook de treino** pro maromba brasileiro. O coração é **logar treino ao
vivo, na academia, com uma mão, entre séries**: campo grande de carga/reps, "última
vez: X kg × Y" na cara, cronômetro de descanso automático e o treino em andamento que
**nunca se perde** (fica salvo local e sobe quando a rede volta).

Dark mode por padrão, copy em pt-BR sem tom de robô, um CTA por tela.

O **Perfil** já cobre o básico estilo Hevy: stats do atleta (treinos, sequência
de semanas, volume total), edição de nome/altura/nascimento, peso corporal com
gráfico e % gordura, medidas corporais e descanso padrão do cronômetro.

> MVP: **sem** IA, feed social, gestão de aluno, offline-first com sync, web/desktop
> ou pagamentos. O modelo de dados já prevê peso/medidas/metas pro que vem depois.

## Stack

| Camada    | Tecnologia |
|-----------|------------|
| Monorepo  | Bun workspaces |
| App       | Expo (React Native) · expo-router · NativeWind · TanStack Query · expo-secure-store |
| Backend   | Bun · Elysia · validação TypeBox nativa em toda rota |
| Banco     | PostgreSQL · Drizzle ORM (schema + migrations versionados) |
| Auth      | Senha argon2 (`Bun.password`) · JWT de acesso curto (~15 min) · refresh rotativo com hash no banco |
| Dev       | docker-compose (Postgres + API com hot reload) |
| CI        | GitHub Actions: lint, typecheck e testes em todo push/PR |

## Layout

```
apps/
  mobile/   # Expo app (expo-router + NativeWind)
  api/      # Elysia + Bun (auth, rotas, validação)
packages/
  db/       # Drizzle schema, migrations, seed de exercícios (pt-BR)
  shared/   # schemas TypeBox + lógica de PR/progressão (fonte única)
docker-compose.yml
.github/workflows/ci.yml
```

## Rodando local

Pré-requisitos: [Bun](https://bun.sh) ≥ 1.1 e Docker (pro Postgres).

### 1. Dependências

```bash
bun install
cp .env.example .env
```

### 2. Backend + banco (docker-compose)

Sobe Postgres (com healthcheck) e a API (hot reload) de uma vez:

```bash
docker compose up
```

A API fica em `http://localhost:3333` (rota de saúde: `GET /health`).

### 3. Migrations + seed

Com o Postgres no ar (via compose ou local):

```bash
bun run db:migrate   # aplica as migrations
bun run db:seed      # popula os exercícios globais em pt-BR
```

> Alternativa sem Docker: aponte `DATABASE_URL` pra um Postgres seu no `.env` e rode
> `bun run dev:api`.

### 4. App (Expo)

```bash
bun run dev:mobile   # ou: bun run --cwd apps/mobile start
```

Abra no Expo Go / emulador. Por padrão o app fala com `http://localhost:3333`
(configurável em `apps/mobile/app.json` → `extra.apiUrl`; num device físico troque
pelo IP da sua máquina).

## Scripts

| Comando | O que faz |
|---------|-----------|
| `bun run dev:api` | Backend com hot reload |
| `bun run dev:mobile` | Expo dev server |
| `bun run db:generate` | Gera migration a partir do schema Drizzle |
| `bun run db:migrate` | Aplica migrations |
| `bun run db:seed` | Semeia exercícios globais |
| `bun run typecheck` | `tsc --noEmit` em todos os pacotes |
| `bun run lint` | Lint do backend |
| `bun run test` | Testes do backend (`bun test`) |

App: `bun run --cwd apps/mobile test` (jest-expo + Testing Library).

## API

Todas as rotas validam input via TypeBox e retornam erro no formato
`{ error: { code, message } }`. Tudo (menos auth público) exige JWT.

- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `PATCH /auth/me` (nome, meta, altura, nascimento)
- `GET/POST/PATCH/DELETE /exercises` (globais read-only; custom são do usuário)
- `GET/POST/PATCH/DELETE /routines` (com exercícios aninhados)
- `POST /workouts` · `PATCH /workouts/:id` · `POST /workouts/:id/sets` · `GET /workouts` · `GET /workouts/:id`
- `GET /stats/prs` · `GET /stats/progression?exerciseId=` · `GET /stats/profile` (treinos, séries, volume total, sequência de semanas, exercício mais feito)
- `GET/POST/PATCH/DELETE /body-metrics` — registro por dia (upsert): peso, % gordura e medidas (peito, cintura, braços, coxas, panturrilha, pescoço)

**Segurança:** hash argon2id, access token curto + refresh rotativo (revoga o antigo
a cada refresh), rate-limit no login, erro de login genérico (não vaza se o email
existe) e CORS restrito às origens do `.env`.

## Testes

- **Backend** (`bun test`): hashing/verify de senha, emissão/refresh/rotação de JWT,
  validação rejeitando payload inválido, cálculo de PR e progressão, e integração de
  auth contra um Postgres real.
- **App** (`jest`): lógica do treino ao vivo (completar série, séries pendentes de
  sync, "última vez", volume/progresso, cronômetro) e render do fluxo de completar
  série.

## Design

Base neutra dark + **uma** cor de destaque (volt), reservada pra ação primária
(iniciar treino / completar série). Tokens em `apps/mobile/tailwind.config.js`.
Touch targets ≥ 44px, contraste alto, estados de erro e vazio explícitos.

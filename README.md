# Apro

## Project Overview
Apro is a SaaS property management platform for Israeli residential
buildings. It manages buildings, units, tenants, owners, and building
committees (Va'ad Bayit). The UI is in Hebrew. The system is designed
for multi-tenancy from day one — every table carries a `tenant_id`.

## Tech Stack
- Next.js (App Router, Server Components, Route Handlers)
- Supabase (Auth + managed PostgreSQL + Row Level Security)
- Drizzle ORM (type-safe queries and migrations)
- Railway (deployment and hosting)
- pnpm workspaces (monorepo)

## Environments

| Environment | Supabase project | Railway service |
|---|---|---|
| Local dev | `apro-dev` | — |
| Staging | `apro-dev` (shared) | Railway staging |
| Production | `apro-prod` | Railway production |

Local dev and staging share `apro-dev`. When the plan upgrades to a paid tier, staging gets its own project.

---

## Getting Started (Local Dev)

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Get `.env.local`** from a teammate. It contains credentials for `apro-dev`.

3. **Apply migrations** to create all tables:
   ```bash
   pnpm db:migrate
   ```

4. **Apply manual SQL** (RLS policies, functions, seed data):
   ```bash
   pnpm db:apply-manual -- --seed
   ```

5. **Register the auth hook** in the `apro-dev` Supabase dashboard (one-time):
   - Authentication → Hooks → Custom Access Token Hook
   - Select `public.custom_access_token_hook`

6. **Configure Auth settings** in the `apro-dev` dashboard (one-time):
   - Email provider → disable "Confirm email"
   - URL Configuration → add `http://localhost:3000/auth/callback` as a redirect URL

7. **Start the dev server**
   ```bash
   pnpm dev
   ```

---

## Key Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start local dev server |
| `pnpm db:generate` | Generate a new migration file after a schema change |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:apply-manual` | Re-apply RLS, indexes, functions to the current DB |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

---

## Database Migrations

Edit schema files → generate migration → apply migration → commit both.

```bash
# 1. Edit packages/db/src/schema/*.ts
# 2. Generate the migration file
pnpm db:generate
# 3. Apply it to the database
pnpm db:migrate
# 4. Commit schema file + migration file together
git add packages/db/src/schema/ packages/db/migrations/
git commit -m "feat(db): describe your change"
```

Migrations run **automatically on every Railway deploy** — `nixpacks.toml` runs `pnpm db:migrate && pnpm start`.

### Two database URLs

```
DATABASE_URL           — port 6543 (transaction pooler)  used by the running app
MIGRATION_DATABASE_URL — port 5432 (session pooler)      used by pnpm db:migrate only
```

Use the **same pooler hostname** for both (e.g. `aws-1-ap-south-1.pooler.supabase.com`), just change the port.
Do **not** use the direct connection (`db.<ref>.supabase.co`) for `MIGRATION_DATABASE_URL` in Railway — it resolves to IPv6 which Railway cannot reach.

### Two kinds of database files

| Type | Location | Managed by | Applied by |
|---|---|---|---|
| Drizzle migrations | `packages/db/migrations/*.sql` | Auto-generated | `pnpm db:migrate` |
| Manual SQL | `packages/db/migrations/manual/*.sql` | Hand-written | `pnpm db:apply-manual` |

Manual SQL covers RLS policies, triggers, functions, and indexes — things Drizzle cannot manage. All files are idempotent (safe to re-run).

---

## Project Structure

```text
├── app/                      - Next.js App Router
│   ├── dashboard/            - Protected management UI (Hebrew)
│   ├── api/v1/               - REST API (buildings, units, people, roles, auth)
│   ├── login/                - Auth page (magic link + password)
│   └── auth/callback/        - Supabase auth callback handler
├── lib/
│   ├── supabase/             - Server, middleware and browser Supabase clients
│   └── api/                  - Response helpers, Zod schemas
└── packages/
    └── db/
        ├── src/schema/       - Drizzle table definitions — edit these to change schema
        ├── migrations/       - Auto-generated SQL files — do not edit by hand
        └── migrations/manual/- Hand-written SQL: RLS, triggers, functions, indexes
```

---

## Database Schema

Ten tables, all with `tenant_id`:

| Table | Purpose |
|---|---|
| `tenants` | One row per company using the platform |
| `buildings` | Physical buildings, linked to a tenant |
| `units` | Apartments within a building |
| `people` | Tenants, owners, guarantors — people linked to units |
| `unit_roles` | Join table: a person's role in a unit (owner/tenant/guarantor) |
| `app_roles` | Platform access: which Supabase user has which role |
| `unit_payment_config` | Monthly fee amount per unit |
| `charges` | Monthly charge records generated per unit |
| `payments` | Payments recorded against a charge |
| `charge_generation_log` | Audit log for the charge generation cron |

---

## Environment Variables

See `.env.example` for the full template.

| Variable | Used by | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | App (client + server) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App (client) | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | App (server only) | Admin key — never expose to browser |
| `DATABASE_URL` | App (runtime) | Port **6543** transaction pooler |
| `MIGRATION_DATABASE_URL` | `pnpm db:migrate` + Railway deploy | Port **5432** session pooler — **required in Railway env vars** |
| `APRO_TENANT_ID` | Cron endpoint | UUID of the tenant row in this environment's DB |
| `CHARGE_GENERATION_SECRET` | Cron endpoint | Random secret protecting the charge generation endpoint |

---

## Setting Up a New Environment (Staging or Production)

### 1. Railway environment variables

Set all variables from `.env.example`, pointing to the correct Supabase project:

- `NEXT_PUBLIC_SUPABASE_URL` — project URL from Supabase → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key from same page
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key from same page
- `DATABASE_URL` — pooler URL at port **6543** (Supabase → Settings → Database → Connection string → Transaction mode)
- `MIGRATION_DATABASE_URL` — same pooler host, port **5432** (Session mode)
- `APRO_TENANT_ID` — UUID of the tenant row (insert one first, see step 4 below)
- `CHARGE_GENERATION_SECRET` — generate with `openssl rand -hex 32`

### 2. Apply Drizzle migrations

Railway does this automatically on first deploy via `pnpm db:migrate`.

### 3. Apply manual SQL

This is **not** run automatically. Run it once when setting up the project:

```bash
MIGRATION_DATABASE_URL="<session-pooler-url>" pnpm db:apply-manual
```

### 4. Insert seed data

Create a tenant row and an `app_roles` row for your admin user directly in the Supabase SQL editor:

```sql
-- Insert tenant (use a real UUID)
INSERT INTO tenants (id, name) VALUES ('<your-uuid>', 'Apro');

-- Insert admin user (get supabase_user_id from Authentication → Users)
INSERT INTO app_roles (tenant_id, supabase_user_id, role)
VALUES ('<your-tenant-uuid>', '<supabase-user-uuid>', 'manager');
```

### 5. One-time Supabase dashboard steps

- Authentication → Hooks → add **Custom Access Token Hook** → select `public.custom_access_token_hook`
- Authentication → URL Configuration → add `https://<your-domain>/auth/callback` as a redirect URL
- Authentication → Providers → Email → disable "Confirm email" (optional for staging)

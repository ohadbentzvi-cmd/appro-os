# Apro

## Project Overview
Apro is a SaaS property management platform for Israeli residential 
buildings. It manages buildings, units, tenants, owners, and building 
committees (Va'ad Bayit). The UI is in Hebrew. The system is designed 
for multi-tenancy from day one — every table carries a tenant_id, 
currently scoped to Apro's own record.

## Tech Stack
- Next.js 14 (App Router, Server Components, Route Handlers)
- Supabase (Auth + managed PostgreSQL + Row Level Security)
- Drizzle ORM (type-safe queries and migrations)
- Railway (deployment and hosting)
- pnpm workspaces (monorepo)

## Getting Started
1. Clone the repository
2. Run `pnpm install`
3. Copy `.env.example` to `.env.local` and populate all keys
4. In Supabase Dashboard: enable Email provider, disable email 
   confirmation (dev), set redirect URL to http://localhost:3000/auth/callback
5. Run `pnpm db:push` to sync schema to your Supabase instance
6. Run `pnpm dev`

## Project Structure
```text
├── apps/
│   └── web/                  - Next.js app
│       ├── app/
│       │   ├── dashboard/    - Protected management UI (Hebrew)
│       │   ├── api/v1/       - REST API (buildings, units, people, roles, auth)
│       │   ├── login/        - Auth page (magic link + password)
│       │   └── portal/       - Tenant/owner portal (placeholder)
│       └── lib/
│           ├── supabase/     - Server, middleware and browser clients
│           └── api/          - Shared response helpers, Zod schemas
└── packages/
    └── db/                   - Drizzle schemas, migrations, shared db client
```

## Database Schema
Six tables, all with tenant_id: `tenants`, `buildings`, `units`, 
`people`, `unit_roles` (the core join table — roles are scoped 
to a unit, not global), `app_roles` (platform access control).

## API
All endpoints under `/api/v1/`. Consistent response envelope:
`{ data, error, meta }`. Zod-validated on every route.
Main resources: `/buildings`, `/units`, `/people`, `/roles`, `/auth/me`.

## Key Scripts
- `pnpm dev` — start local dev server
- `pnpm build` — production build
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:push` — push schema directly to database
- `pnpm db:studio` — open Drizzle Studio

## Environment Variables
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key |
| `DATABASE_URL` | Postgres connection string (Supabase pooler, port 6543) |
| `APRO_TENANT_ID` | UUID of the Apro tenant row (from tenants table) |
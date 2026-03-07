# Manual SQL Migrations

These files contain SQL that is **not managed by Drizzle**. Apply them with:

```bash
pnpm db:apply-manual           # applies 001–004
pnpm db:apply-manual -- --seed  # also inserts local dev seed data
```

Or apply individual files via the Supabase SQL editor or `psql`.

| File | What it does | Re-run safe? |
|---|---|---|
| `001_indexes.sql` | Tenant-scoping and performance indexes | Yes (`IF NOT EXISTS`) |
| `002_rls.sql` | Row Level Security policies on all tables | Yes (drops and recreates) |
| `003_auth_hook.sql` | `custom_access_token_hook` function + grants | Yes (`CREATE OR REPLACE`) |
| `004_functions.sql` | Payment status trigger, charge generation function | Yes (`CREATE OR REPLACE`) |
| `seed_local.sql` | Dev tenant row — **local only, never staging/production** | Yes (`ON CONFLICT DO NOTHING`) |

## Apply order

```
001 → 002 → 003 → 004
```

`seed_local.sql` is run separately after the above four, only on local.

## After running 003_auth_hook.sql

You must manually register the hook in the Supabase dashboard:

1. Go to **Authentication → Hooks**
2. Add a **Custom Access Token Hook**
3. Select `public.custom_access_token_hook`

This dashboard step cannot be scripted and must be done for each new Supabase project.

## When to re-run

Re-run all four files (in order) whenever you set up a new Supabase project. Re-run individual files if you change their logic and need to apply the update to an existing project.

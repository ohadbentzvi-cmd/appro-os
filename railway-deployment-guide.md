# Railway Deployment Guide

This guide details the final manual steps to properly configure your Railway environment and link your Supabase instance to the new domain.

## 1. Railway Environment Variables
When creating the project on Railway, ensure the following environment variables are strictly defined in the project settings:

```env
# Sentry - Required for error catching and source maps
NEXT_PUBLIC_SENTRY_DSN="<your-sentry-dsn>"
SENTRY_AUTH_TOKEN="<your-sentry-auth-token>"
SENTRY_ORG="<your-sentry-org-slug>"
SENTRY_PROJECT="<your-sentry-project-slug>"

# Supabase - Required for database + auth
NEXT_PUBLIC_SUPABASE_URL="<your-supabase-url>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-supabase-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"

# Database Access (Drizzle)
DATABASE_URL="<your-supabase-pgbouncer-or-pooling-url>"
APRO_TENANT_ID="<the-tenant-uuid>"

# Internal cron secrets
CHARGE_GENERATION_SECRET="<a-secure-random-string-for-cron>"
```

## 2. GitHub Integration Setup
1. In Railway, click **New Project** -> **Deploy from GitHub repo**.
2. Select the `apro-os` repository.
3. Railway will automatically detect the `nixpacks.toml` file at the root.
4. Verify the Build command is `nixpacks build` and the Start command is `pnpm db:migrate && node server.js`.

> [!NOTE]
> Every time you merge to `main`, Railway will trigger a deployment. Before deploying, GitHub Actions will run `lint`, `test`, and `build` safely.

## 3. Supabase Authentication Redirects
Since Railway will generate a new live domain (e.g. `apro-os-production.up.railway.app` or your custom domain), Supabase must be configured to allow auth callbacks to that root domain.

1. Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
2. Set the `Site URL` to your primary live domain (e.g. `https://your-domain.com`).
3. Add `https://your-domain.com/**` to the **Redirect URLs** list so magic links and auth callbacks resolve effectively.

## 4. Final Verification
1. Access the live domain.
2. Confirm the app layout loads.
3. Vist `https://<your-domain>/api/health` to confirm the backend is returning a `200 { "status": "ok" }`. Railroad relies on this to confirm deployments!

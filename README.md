# Apro

## Project Overview
Apro is a Next.js SaaS dashboard application for property and tenant management. It manages buildings, units, roles, and provides a backend API layer for data access and management.

## Tech Stack
- Next.js (App Router, Route Handlers)
- Supabase (Authentication & PostgreSQL)
- Drizzle ORM (Database Queries & Migrations)
- Railway (Deployment and Hosting)
- pnpm workspaces (Monorepo setup)

## Getting Started
1. Clone the repository
2. Run `pnpm install`
3. Copy `.env.example` to `.env.local` and populate the keys
4. Run `pnpm dev` to start the local development server

## Key Scripts
- `pnpm dev` - Start the local development server
- `pnpm build` - Build the application for production
- `pnpm db:generate` - Generate Drizzle schema migrations
- `pnpm db:push` - Push schema changes directly to the database
- `pnpm db:studio` - Open Drizzle Studio for visual database management

## Project Structure
```text
├── app/          - Next.js frontend pages and API route handlers
├── packages/db/  - Drizzle ORM schemas, migrations, and shared DB client
```

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (https://xyz.supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key for Supabase JS client
- `SUPABASE_SERVICE_ROLE_KEY` - Secret server-only role key for admin actions
- `DATABASE_URL` - PostgreSQL connection string used by Drizzle ORM
- `APRO_TENANT_ID` - UUID for multi-tenant data insertion context

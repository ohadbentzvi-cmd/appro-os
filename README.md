# APRO OS Next.js Migration

This repository represents the SaaS dashboard for APRO OS, recently migrated from a Vite + React SPA architecture to Next.js 14 App Router.

## Project Structure

This project utilizes the Next.js App Router paradigm:
* `app/` - Contains the App Router segments (`/dashboard/buildings`, `/dashboard/people`) and API routes.
* `app/components/` - Reusable UI components including modals and tables.
* `lib/supabase/` - Contains the Supabase client utilizing `@supabase/supabase-js`.

## Getting Started

First, install dependencies:
```bash
npm install
```

Make sure to create `.env.local` containing your Supabase keys:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build for Production

```bash
npm run build
npm start
```

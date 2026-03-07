import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

// Resolve .env.local from repo root (two levels up from packages/db/)
dotenv.config({ path: '../../.env.local' })

export default {
    schema: './src/schema/index.ts',
    out: './migrations',
    dialect: 'postgresql',
    dbCredentials: {
        // Use direct connection (port 5432) for migrations — the transaction pooler
        // (port 6543) is unreliable for DDL. Set MIGRATION_DATABASE_URL in .env.local
        // to the direct URL; DATABASE_URL remains the pooler URL for the runtime app.
        url: (process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL)!,
    },
} satisfies Config

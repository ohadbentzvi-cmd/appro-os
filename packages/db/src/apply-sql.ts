/**
 * Applies all manual SQL files to the target database.
 * Uses MIGRATION_DATABASE_URL if set, otherwise DATABASE_URL.
 *
 * Usage:
 *   pnpm --filter @apro/db db:apply-manual           # applies 001–004
 *   pnpm --filter @apro/db db:apply-manual -- --seed  # also applies seed_local.sql
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import postgres from 'postgres'

config({ path: resolve(__dirname, '../../../.env.local') })

const dbUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL is not set')

const includeSeed = process.argv.includes('--seed')

const manualDir = resolve(__dirname, '../migrations/manual')
const files = [
    '001_indexes.sql',
    '002_rls.sql',
    '003_auth_hook.sql',
    '004_functions.sql',
    '005_reminder_logs_rls.sql',
    '006_whatsapp_templates_rls.sql',
    '007_receipt_rls.sql',
    ...(includeSeed ? ['seed_local.sql'] : []),
]

async function main() {
    const sql = postgres(dbUrl!, { max: 1 })
    for (const file of files) {
        const content = readFileSync(resolve(manualDir, file), 'utf-8')
        console.log(`Applying ${file}...`)
        await sql.unsafe(content)
        console.log(`  done.`)
    }
    console.log('\nAll manual SQL applied successfully.')
    if (includeSeed) {
        console.log('Tenant UUID for APRO_TENANT_ID: 00000000-0000-0000-0000-000000000001')
    }
    await sql.end()
}

main().catch(async (err) => {
    console.error('Failed:', err.message)
    process.exit(1)
})

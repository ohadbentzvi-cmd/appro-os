import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../.env.local') });

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not found');

    const sql = postgres(dbUrl);

    const migrationSql = readFileSync(resolve(__dirname, '../migrations/0003_enable_rls.sql'), 'utf-8');

    console.log('Applying custom SQL migration...');
    await sql.unsafe(migrationSql);
    console.log('Done.');

    await sql.end();
}

main().catch(console.error);

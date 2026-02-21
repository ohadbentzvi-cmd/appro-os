import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

const appRoles = pgTable('app_roles', {
    id: uuid('id').primaryKey(),
    supabaseUserId: uuid('supabase_user_id').notNull(),
    role: text('role').notNull(),
});

async function main() {
    const roles = await db.select().from(appRoles);
    console.log(roles);
    process.exit(0);
}

main().catch(console.error);

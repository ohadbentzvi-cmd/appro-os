import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index'

const connectionString = process.env.DATABASE_URL!

// For migrations and scripts: pooling disabled
// For query usage: connection pooling via Supabase pooler
const client = postgres(connectionString, {
    prepare: false,  // required for Supabase transaction pooler
    ssl: 'require'
})

export const db = drizzle(client, { schema })

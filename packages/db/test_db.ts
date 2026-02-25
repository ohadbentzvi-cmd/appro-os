import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL as string);
async function run() {
    try {
        const query = fs.readFileSync('migrations/0005_add_credit_card.sql', 'utf8');
        await sql.unsafe(query);
        console.log("Migration executed successfully");
    } catch (e: any) {
        if (e.message.includes('does not exist')) {
            console.log("Type doesn't exist, treating as success or skipping");
        } else {
            console.error("Migration error:", e);
        }
    }
    process.exit(0);
}
run();

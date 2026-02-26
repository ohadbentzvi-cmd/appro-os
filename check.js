const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  try {
    const res = await sql`SELECT * FROM drizzle.__drizzle_migrations`;
    console.log(res);
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}
run();

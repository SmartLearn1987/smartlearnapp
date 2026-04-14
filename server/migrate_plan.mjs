import { pool } from "./db.mjs";

async function run() {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Miễn phí',
      ADD COLUMN IF NOT EXISTS plan_start_date DATE,
      ADD COLUMN IF NOT EXISTS plan_end_date DATE;
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

run();

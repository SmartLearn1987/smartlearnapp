import { query } from "./db.mjs";

async function migrate() {
  try {
    await query(`ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS is_repository boolean DEFAULT false;`);
    await query(`ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;`);
    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();

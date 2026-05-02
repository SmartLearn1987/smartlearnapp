import { query } from "./db.mjs";

async function migrate() {
  try {
    await query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_repository boolean DEFAULT false;`);
    await query(`UPDATE exams SET is_repository = true WHERE title = 'Kho câu hỏi cá nhân';`);
    console.log("Migration successful for exams.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();

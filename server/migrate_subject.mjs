import { query } from "./db.mjs";

async function migrate() {
  try {
    console.log("Adding subject_id to quizlet_sets...");
    await query(`
      ALTER TABLE quizlet_sets 
      ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();

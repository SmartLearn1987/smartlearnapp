import { query } from "./db.mjs";

async function migrate() {
  try {
    console.log("Creating pictogram_questions table...");
    await query(`
      CREATE TABLE IF NOT EXISTS pictogram_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_url TEXT NOT NULL,
        answer TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'extreme'
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_pictogram_created_by ON pictogram_questions(created_by);
    `);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();

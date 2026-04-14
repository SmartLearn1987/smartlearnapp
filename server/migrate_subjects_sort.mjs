import { query } from "./db.mjs";

async function migrate() {
  try {
    console.log("Adding sort_order to subjects...");
    // 1. Add sort_order column if not exists
    await query(`
      ALTER TABLE subjects 
      ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
    `);
    
    // 2. Initialize sort_order based on created_at (ascending)
    console.log("Initializing sort_order...");
    const { rows } = await query("SELECT id FROM subjects ORDER BY created_at ASC");
    for (let i = 0; i < rows.length; i++) {
       await query("UPDATE subjects SET sort_order = $1 WHERE id = $2", [i, rows[i].id]);
    }
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();

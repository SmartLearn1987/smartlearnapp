import { query } from "./db.mjs";

async function checkTable() {
  try {
    const { rows } = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'exam_results'
      );
    `);
    console.log("Table 'exam_results' exists:", rows[0].exists);
    
    if (rows[0].exists) {
      const { rows: cols } = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'exam_results'
      `);
      console.log("Columns:", cols);
    }
  } catch (err) {
    console.error("Check Error:", err.message);
  } finally {
    process.exit(0);
  }
}

checkTable();

import { query } from "./server/db.mjs";

async function checkSchema() {
  const tablesToCheck = ['subjects', 'curricula', 'learning_categories', 'learning_questions'];
  
  for (const table of tablesToCheck) {
    try {
      const { rows } = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      console.log(`Table '${table}' exists:`, rows[0].exists);
      
      if (rows[0].exists) {
        const { rows: cols } = await query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [table]);
        console.log(`Columns for '${table}':`, cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
      } else {
        console.log(`Table '${table}' is MISSING!`);
      }
    } catch (err) {
      console.error(`Error checking table '${table}':`, err.message);
    }
    console.log('---');
  }
  process.exit(0);
}

checkSchema();

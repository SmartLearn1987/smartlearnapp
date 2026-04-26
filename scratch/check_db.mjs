import { query } from '../server/db.mjs';

async function check() {
  try {
    const userLevel = 'Tiểu học';
    const sql = `select q.*, 
          (select count(*)::int from quizlet_terms t where t.quizlet_set_id = q.id) as term_count
         from quizlet_sets q
         where q.is_public = true and q.education_level = $1::text`;
    
    const q = await query(`EXPLAIN ${sql}`, [userLevel]);
    console.log(q.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit();
  }
}

check();

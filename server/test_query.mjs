import { query } from "./db.mjs";

async function test() {
  const userId = "dd46a0fa-cde1-493b-aaf9-9b2e88823c7b"; // From check_subjects.mjs output
  try {
    const sql = `select s.*, count(c.id)::int as curriculum_count
       from subjects s
       left join curricula c on c.subject_id = s.id and c.user_id = $1
       group by s.id
       order by s.sort_order asc, s.created_at desc`;
    const res = await query(sql, [userId]);
    console.log("Result count:", res.rows.length);
    console.log("Sample row:", JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error("Query Error:", err);
  }
}

test();

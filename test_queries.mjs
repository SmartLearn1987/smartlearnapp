import { query } from "./server/db.mjs";

async function testQuery() {
  try {
    console.log("Testing /api/subjects query...");
    const { rows: subjects } = await query(
      `select s.*, count(c.id)::int as curriculum_count
       from subjects s
       left join curricula c on c.subject_id = s.id and c.is_public = true
       group by s.id
       order by s.sort_order asc, s.created_at desc`
    );
    console.log("Subjects query OK, rows:", subjects.length);

    console.log("Testing /api/curricula query...");
    const { rows: curricula } = await query(
      `select c.*,
          u.display_name as "authorName",
          u.avatar_url as "authorAvatar",
          u.role as "authorRole",
          (select count(*)::int from lessons l where l.curriculum_id = c.id) as lesson_count
       from curricula c
       left join users u on c.user_id = u.id
       order by c.sort_order asc, c.created_at desc`
    );
    console.log("Curricula query OK, rows:", curricula.length);

    console.log("Testing /api/learning/categories query...");
    const { rows: categories } = await query(
      `SELECT c.*, COUNT(q.id) as item_count 
       FROM learning_categories c 
       LEFT JOIN learning_questions q ON c.id = q.category_id 
       GROUP BY c.id 
       ORDER BY c.created_at DESC`
    );
    console.log("Categories query OK, rows:", categories.length);

  } catch (err) {
    console.error("Query Error:", err.message);
    console.error("Full Error:", err);
  } finally {
    process.exit(0);
  }
}

testQuery();

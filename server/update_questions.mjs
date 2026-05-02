import { query } from "./db.mjs";

async function update() {
  try {
    await query(`
      UPDATE exam_questions 
      SET is_repository = true 
      FROM exams 
      WHERE exam_questions.exam_id = exams.id 
      AND exams.title = 'Kho câu hỏi cá nhân'
    `);
    console.log("Updated existing questions to repository status.");
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    process.exit();
  }
}

update();

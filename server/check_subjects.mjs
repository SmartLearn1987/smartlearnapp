import { query } from "./db.mjs";

async function check() {
  try {
    const subjects = await query("SELECT * FROM subjects");
    console.log("Subjects count:", subjects.rows.length);
    console.log("Subjects:", JSON.stringify(subjects.rows, null, 2));
    
    const curricula = await query("SELECT * FROM curricula");
    console.log("Curricula count:", curricula.rows.length);
  } catch (err) {
    console.error(err);
  }
}

check();

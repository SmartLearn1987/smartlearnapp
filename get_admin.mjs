import { query } from "./server/db.mjs";

async function getAdminSession() {
  try {
    const { rows } = await query("SELECT id, session_token FROM users WHERE username = 'adminsmart'");
    console.log(JSON.stringify(rows[0]));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

getAdminSession();

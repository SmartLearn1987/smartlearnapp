import { query } from "./db.mjs";

async function up() {
  await query(`
    create table if not exists deleted_users (
      id uuid primary key default gen_random_uuid(),
      original_id uuid,
      username text,
      deleted_at timestamptz not null default now()
    );
  `);
  console.log("Migration deleted_users completed.");
}

up().catch(console.error).finally(() => process.exit(0));

import { pool } from "./db.mjs";

async function run() {
  try {
    console.log("Starting migration: subscription_plans table...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        duration_days INTEGER NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Insert default plans if table is empty
    const { rowCount } = await pool.query("SELECT id FROM subscription_plans LIMIT 1");
    if (rowCount === 0) {
      console.log("Inserting default plans...");
      await pool.query(`
        INSERT INTO subscription_plans (name, duration_days, price, description, sort_order)
        VALUES 
          ('Miễn phí', 6, 0, 'Gói dùng thử mặc định', 0),
          ('1 tháng', 30, 50000, 'Gói cơ bản 1 tháng', 1),
          ('2 tháng', 60, 90000, 'Gói tiết kiệm 2 tháng', 2),
          ('3 tháng', 90, 120000, 'Gói phổ biến 3 tháng', 3),
          ('6 tháng', 180, 220000, 'Gói ưu đãi 6 tháng', 4),
          ('12 tháng', 365, 400000, 'Gói năm tiết kiệm nhất', 5),
          ('Vô thời hạn', 1800, 1000000, 'Gói trọn đời ưu đãi', 6);
      `);
    }

    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

run();

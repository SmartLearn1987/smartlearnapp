import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Load .env trước (ưu tiên không ghi đè biến hệ thống của Railway)
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: false });

const { Pool } = pg;

function envString(key, fallback = "") {
  const val = process.env[key];
  if (val === undefined || val === null) return String(fallback);
  return String(val);
}


// 2. PHÂN LOẠI MÔI TRƯỜNG
// Railway thường cấp biến RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT, hoặc DATABASE_URL
const connectionString = process.env.DATABASE_URL || process.env.PGURL || process.env.DATABASE_PRIVATE_URL;

// Một số hệ thống Railway dùng domain .rlwy.net
const isRailway = 
  !!process.env.RAILWAY_PROJECT_ID || 
  !!process.env.RAILWAY_ENVIRONMENT ||
  !!process.env.RAILWAY_SERVICE_ID ||
  (connectionString && (connectionString.includes("railway") || connectionString.includes("rlwy.net")));

let poolConfig;

if (isRailway || (connectionString && connectionString.startsWith("postgres"))) {
  console.log("[DB] Mode: Production/Cloud");

  if (connectionString) {
    const masked = connectionString.replace(/:([^@]+)@/, ":****@");
    console.log("[DB] Target Host (URL):", connectionString.split("@")[1]?.split("/")[0] || "Unknown");
    poolConfig = {
      connectionString,
      ssl: { rejectUnauthorized: false }
    };
  } else if (process.env.PGHOST && process.env.PGHOST !== "localhost" && process.env.PGHOST !== "127.0.0.1") {
    // Fallback: Sử dụng các biến rời PGUSER, PGHOST... nếu có và không phải localhost
    console.log("[DB] Target Host (Vars):", process.env.PGHOST);
    poolConfig = {
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: parseInt(process.env.PGPORT || "5432"),
      ssl: { rejectUnauthorized: false }
    };
  } else {
    throw new Error(
      "\n[DB Error] Railway environment detected, but database configuration is missing!\n" +
      "---------------------------------------------------------------------------\n" +
      "HƯỚNG DẪN XỬ LÝ:\n" +
      "1. Truy cập vào Dashboard của Railway.\n" +
      "2. Chọn dịch vụ 'Backend'.\n" +
      "3. Tab 'Variables' -> Chọn 'New Variable' -> 'Reference'.\n" +
      "4. Chọn dịch vụ 'Postgres' để liên kết biến DATABASE_URL.\n" +
      "---------------------------------------------------------------------------\n"
    );
  }
} else {
  console.log("[DB] Mode: Local Development");

  const pgUser = envString("PGUSER", "postgres");
  const pgHost = envString("PGHOST", "localhost");
  const pgDb   = envString("PGDATABASE", "postgres");
  const pgPass = envString("PGPASSWORD", "");
  const pgPort = parseInt(envString("PGPORT", "5432"), 10);

  console.log("[DB] Params:", {
    host: pgHost,
    port: pgPort,
    database: pgDb,
    user: pgUser,
    passType: typeof pgPass,
    passLength: pgPass.length
  });

  poolConfig = {
    user: String(pgUser),
    host: String(pgHost),
    database: String(pgDb),
    port: pgPort,
  };

  // Chỉ thêm password vào config nếu nó có giá trị (không rỗng)
  if (pgPass && pgPass.length > 0) {
    poolConfig.password = String(pgPass);
  }
}




export const pool = new Pool(poolConfig);

// Kiểm tra kết nối nhanh khi khởi động
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error("[DB] Initial connection failed! Error:", err.message);
    if (isRailway) {
      console.error("[DB] LƯU Ý: Nếu đây là lỗi trên Railway, hãy đảm bảo bạn đã liên kết biến DATABASE_URL từ dịch vụ Postgres sang dịch vụ Backend.");
    }
  } else {
    console.log("[DB] Database connected successfully.");
  }
});


export async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    throw err;
  }
}


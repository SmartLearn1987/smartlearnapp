import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import dns from "node:dns";
import { query, pool } from "./db.mjs";

// Ép buộc ưu tiên IPv4 để sửa lỗi ENETUNREACH trên Railway (IPv6 không hỗ trợ)
dns.setDefaultResultOrder("ipv4first");


// Biến môi trường được load trong ./db.mjs (path .env cố định theo thư mục project)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const uploadsDir = path.join(projectRoot, "uploads");
const distDir = path.join(projectRoot, "dist");

await fs.mkdir(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safe = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${unique}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const app = express();
const PORT = Number(process.env.PORT || 4000);
const API_PREFIX = "/api";

app.use(cors({
  origin: true, // Allow all origins in development, or specify your production domain
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-user-id", "x-session-token"],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(distDir)); // Serve built frontend assets

// Log all requests
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

// ── API Key Middleware ────────────────────────────────────────────────────
app.use(`${API_PREFIX}`, (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  // Lấy key từ env và loại bỏ dấu ngoặc đơn/kép dư thừa nếu có (thường gặp khi cấu hình trên cloud)
  const envKey = process.env.VITE_API_KEY;
  const expectedKey = envKey ? envKey.trim().replace(/^["']|["']$/g, '') : "";

  if (expectedKey !== "") {
    const headerKey = req.headers["x-api-key"];
    const providedKey = headerKey ? String(headerKey).trim().replace(/^["']|["']$/g, '') : "";

    if (providedKey !== expectedKey) {
      const maskedExpected = expectedKey.substring(0, 4) + "...";
      const maskedProvided = providedKey ? providedKey.substring(0, 4) + "..." : "NONE";
      console.warn(`[Security] API Key mismatch for ${req.method} ${req.path}. Expected: ${maskedExpected}, Provided: ${maskedProvided}.`);

      return res.status(403).json({ error: "API Key không hợp lệ" });
    }
  }
  next();
});

app.post(`${API_PREFIX}/upload`, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      // Multer error (e.g. file too large) – always send JSON so the
      // connection is closed cleanly instead of being aborted.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File quá lớn. Giới hạn tối đa là 10MB." });
      }
      console.error("[Upload Multer Error]", err.message);
      return res.status(400).json({ error: err.message || "Upload thất bại." });
    }

    console.log(`[Upload] Received upload request: ${req.file?.originalname || 'No file'}`);
    if (!req.file) {
      console.error("[Upload Error] No file in request");
      return res.status(400).json({ error: "Không có file được tải lên." });
    }

    // Trả về đường dẫn truy cập cho ảnh
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`[Upload] File saved successfully: ${fileUrl}`);
    res.json({ url: fileUrl });
  });
});

// Auto-migrate schema
(async () => {
  try {
    const queries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token text;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level text;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text DEFAULT 'Miễn phí';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_start_date timestamp;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_end_date timestamp;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`,
      `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS user_id uuid;`,
      `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;`,
      `ALTER TABLE curricula ADD COLUMN IF NOT EXISTS education_level text;`,
      `ALTER TABLE curricula ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;`,
      `ALTER TABLE curricula ADD COLUMN IF NOT EXISTS image_url text;`,
      `ALTER TABLE curricula ADD COLUMN IF NOT EXISTS user_id uuid;`,
      `ALTER TABLE curricula ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token text;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS access_token_expires_at timestamp;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamp;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;`,
      `ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS is_repository boolean DEFAULT false;`,
      `ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;`,
      `ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS category text;`,
      `CREATE TABLE IF NOT EXISTS system_pages (

        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE NOT NULL,
        title text NOT NULL,
        content text NOT NULL,
        updated_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS proverbs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        content text NOT NULL,
        level integer NOT NULL DEFAULT 1,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS system_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        duration_days INTEGER NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;`,
      `CREATE TABLE IF NOT EXISTS timetable_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        sort_order integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS timetable_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id uuid NOT NULL REFERENCES timetable_groups(id) ON DELETE CASCADE,
        day text NOT NULL,
        subject text NOT NULL,
        start_time text NOT NULL,
        end_time text NOT NULL,
        room text,
        color text,
        created_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS user_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        due_date date,
        completed boolean DEFAULT false,
        priority text DEFAULT 'medium',
        created_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS user_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text,
        content text,
        color text,
        updated_at timestamptz DEFAULT now()
      );`,
      `CREATE TABLE IF NOT EXISTS deleted_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        original_id uuid,
        username text,
        deleted_at timestamptz NOT NULL DEFAULT now()
      );`
    ];

    for (const q of queries) {
      try {
        await query(q);
      } catch (e) {
        console.warn(`[Migration Warning] Query failed: ${q.trim().substring(0, 100)}... Error: ${e.message}`);
      }
    }
    console.log("[Migration] Queries finished.");

    // ── Cascade Deletion Migration ──────────────────────────────────────────
    // Ensure that when a user is deleted, all their related data is also removed.
    const cascadeConfigs = [
      { table: 'subjects', column: 'user_id', constraint: 'subjects_user_id_fkey' },
      { table: 'curricula', column: 'user_id', constraint: 'curricula_user_id_fkey' },
      { table: 'quizlet_sets', column: 'user_id', constraint: 'quizlet_sets_user_id_fkey' },
      { table: 'exams', column: 'user_id', constraint: 'exams_user_id_fkey' },
      { table: 'learning_categories', column: 'created_by', constraint: 'learning_categories_created_by_fkey' },
      { table: 'pictogram_questions', column: 'created_by', constraint: 'pictogram_questions_created_by_fkey' },
      { table: 'dictation_exercises', column: 'created_by', constraint: 'dictation_exercises_created_by_fkey' },
      { table: 'proverbs', column: 'created_by', constraint: 'proverbs_created_by_fkey' },
      { table: 'vua_tieng_viet_questions', column: 'created_by', constraint: 'vua_tieng_viet_questions_created_by_fkey' },
      { table: 'nhanh_nhu_chop_questions', column: 'created_by', constraint: 'nhanh_nhu_chop_questions_created_by_fkey' }
    ];

    for (const conf of cascadeConfigs) {
      try {
        // Drop and recreate constraint with ON DELETE CASCADE
        await query(`ALTER TABLE ${conf.table} DROP CONSTRAINT IF EXISTS ${conf.constraint}`);
        await query(`ALTER TABLE ${conf.table} ADD CONSTRAINT ${conf.constraint} FOREIGN KEY (${conf.column}) REFERENCES users(id) ON DELETE CASCADE`);
      } catch (e) {
        console.warn(`[Migration] Could not update cascade for ${conf.table}:`, e.message);
      }
    }

    console.log("Auto-migration completed: ensured all tables, columns, and cascades are present.");
  } catch (err) {
    console.error("Auto-migration failed:", err.message);
  }
})();

// ── Session Middleware ────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  // Chỉ áp dụng xác thực cho các routes API
  if (!req.path.startsWith(API_PREFIX)) {
    return next();
  }

  if (
    req.path.startsWith(`${API_PREFIX}/login`) ||
    req.path.startsWith(`${API_PREFIX}/register`) ||
    req.path.startsWith(`${API_PREFIX}/refresh-token`) ||
    req.path.startsWith(`${API_PREFIX}/forgot-password`) ||
    req.path.startsWith(`${API_PREFIX}/contact`) ||
    req.path.startsWith(`${API_PREFIX}/nhanhnhuchop/play`) ||
    (req.path.startsWith(`${API_PREFIX}/system-pages`) && req.method === "GET")
  ) {
    return next();
  }
  const userIdRaw = req.headers["x-user-id"];
  const sessionTokenRaw = req.headers["x-session-token"];

  const userId = userIdRaw ? userIdRaw.trim() : null;
  const sessionToken = sessionTokenRaw ? sessionTokenRaw.trim() : null;

  if (!userId || !sessionToken) {
    return res.status(401).json({ error: "Thiếu thông tin xác thực (x-user-id hoặc x-session-token)." });
  }

  // Regex kiểm tra định dạng UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return res.status(401).json({ error: "ID người dùng không hợp lệ (Phải là UUID)." });
  }

  try {
    const { rows } = await query('select session_token, access_token_expires_at from users where id = cast($1 as uuid)', [userId]);
    const user = rows[0];
    if (!user || (user.session_token && user.session_token !== sessionToken)) {
      return res.status(401).json({ error: "Phiên đăng nhập đã hết hạn hoặc bạn đã đăng nhập ở thiết bị/trình duyệt khác." });
    }

    if (user.access_token_expires_at && new Date() > new Date(user.access_token_expires_at)) {
      return res.status(401).json({ error: "TOKEN_EXPIRED" });
    }
  } catch (err) {
    console.error("Session verification error:", err);
    try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] Session verification error: ${err.message}\n${err.stack}\n`); } catch (e) { }
    return res.status(500).json({ error: "Lỗi xác thực phiên làm việc.", details: err.message });
  }
  next();
});

// Note: /api/upload is registered BEFORE the session middleware above (line ~68)
// to allow authenticated users to upload without session token issues.

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ ok: true });
});

async function hashPassword(password) {
  const hash = crypto.createHash("sha256");
  hash.update(password + "hvui-salt-2024");
  return hash.digest("hex");
}

async function generateTokens(userId) {
  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const accessTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await query(
    `update users set session_token = $1, refresh_token = $2, access_token_expires_at = $3, refresh_token_expires_at = $4, last_login = NOW() where id = $5`,
    [accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, userId]
  );

  return { accessToken, refreshToken, accessTokenExpiresAt };
}

/**
 * Gửi email thông qua Nodemailer
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung email định dạng HTML
 */
async function sendMail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Mail Warning] EMAIL_USER or EMAIL_PASS không được cấu hình. Bỏ qua gửi email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // sử dụng cổng 465 SSL thay cho 587 TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Buộc kết nối nội bộ phải qua giao diện IPv4
    localAddress: "0.0.0.0",
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Smart Learn Support" <${process.env.EMAIL_USER}>`,
    to: to.trim(),
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[Mail Success] Email gửi thành công: %s", info.messageId);
    return info;
  } catch (err) {
    console.error("[Mail Error] Gửi email thất bại:", err.message);
    // Không ném lỗi ra ngoài để tránh làm treo luồng chính nếu email lỗi, 
    // trừ khi đó là luồng quan trọng cần dừng lại.
    return null;
  }
}

async function sendRegistrationEmail(email, displayName) {
  const subject = "[Smart Learn] – Xác nhận kích hoạt tài khoản thành công";
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2D9B63; border-bottom: 2px solid #2D9B63; padding-bottom: 10px;">Xin chào ${displayName},</h2>
      <p>Bạn vừa hoàn tất đăng ký tài khoản tại website <b>Smart Learn</b>.</p>
      <p>Bây giờ bạn đã có quyền truy cập vào hệ thống, thực hiện ghi chú bài học, tạo Flashcard, tạo bài trắc nghiệm và cùng chơi các trò giải trí vui về học tập.</p>
      <p>Hãy đăng nhập để bắt đầu bài học đầu tiên ngay. Chúc bạn học tốt, <b>Smart Learn</b> luôn đồng hành cùng bạn!</p>
      
      <div style="background: #fff4e6; padding: 15px; border-radius: 8px; border-left: 4px solid #f08c00; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #d9480f;">Lưu ý quan trọng:</p>
        <p style="margin: 5px 0 0 0;">Để đảm bảo an toàn, vui lòng không chia sẻ thông tin đăng nhập với bất kỳ ai.</p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="font-size: 0.9em; color: #666; font-style: italic;">Trân trọng,<br />Hệ thống hỗ trợ <b>Smart Learn</b></p>

      <div style="margin-top: 20px; font-size: 0.85em; color: #555;">
        <p style="margin-bottom: 5px;">Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi:</p>
        <p style="margin: 0;"><b>Zalo:</b> 0399887380</p>
        <p style="margin: 0;"><b>Email:</b> support.smart.learn@gmail.com</p>
        <p style="margin: 0;"><b>Fanpage:</b> <a href="https://web.facebook.com/profile.php?id=61588811190072" style="color: #2D9B63; text-decoration: none;">Smartlearn</a></p>
      </div>
    </div>
  `;
  return sendMail(email, subject, html);
}
// ── Settings Endpoints ──────────────────────────────────────────────────────
app.get(`${API_PREFIX}/settings/default-plan`, async (req, res) => {
  try {
    const { rows } = await query(`SELECT value FROM system_settings WHERE key = 'default_user_plan'`);
    const plan = rows[0]?.value?.plan || "Miễn phí";
    res.json({ plan });
  } catch (err) {
    console.error("GET default-plan Error:", err.message);
    res.status(500).json({ error: "Lấy gói dịch vụ mặc định thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/settings/default-plan`, async (req, res) => {
  const { plan } = req.body || {};
  if (!plan) return res.status(400).json({ error: "Vui lòng chọn gói dịch vụ" });

  try {
    const value = JSON.stringify({ plan });
    await query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('default_user_plan', $1, NOW()) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [value]
    );
    res.json({ plan });
  } catch (err) {
    console.error("PUT default-plan Error:", err.message);
    res.status(500).json({ error: "Cập nhật gói dịch vụ thất bại, vui lòng thử lại sau" });
  }
});

// ── Auth Endpoints ────────────────────────────────────────────────────────
app.post(`${API_PREFIX}/register`, async (req, res) => {
  const { username, email, password, display_name, education_level } = req.body || {};
  if (!username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin bắt buộc" });
  }

  try {
    // Lấy gói cước mặc định
    let plan = "Miễn phí";
    try {
      const { rows: settingRows } = await query(`SELECT value FROM system_settings WHERE key = 'default_user_plan'`);
      if (settingRows.length > 0) {
        plan = settingRows[0].value.plan || "Miễn phí";
      }
    } catch (e) {
      console.error("Failed to read default plan setting, fallback to Miễn phí", e);
    }

    let durationDays = 6;
    try {
      const { rows: planRows } = await query(`SELECT duration_days FROM subscription_plans WHERE name = $1`, [plan]);
      if (planRows.length > 0) {
        durationDays = planRows[0].duration_days;
      }
    } catch (e) {
      console.error("Failed to fetch plan duration, fallback to 6 days", e);
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `insert into users (username, email, password_hash, display_name, education_level, plan, plan_start_date, plan_end_date)
       values ($1, $2, $3, $4, $5, $6, NOW(), NOW() + ($7 || ' days')::interval)
       returning id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"`,
      [username.trim(), email.trim(), passwordHash, display_name?.trim() || username.trim(), education_level || "Tiểu học", plan, durationDays]
    );

    const newUser = rows[0];
    const { accessToken, refreshToken, accessTokenExpiresAt } = await generateTokens(newUser.id);

    // Gửi email xác nhận đăng ký thành công
    if (newUser && newUser.email) {
      sendRegistrationEmail(newUser.email, newUser.displayName).catch(err => {
        console.error("Gửi email đăng ký thất bại:", err);
      });
    }

    res.status(201).json({ ...newUser, sessionToken: accessToken, refreshToken, accessTokenExpiresAt });
  } catch (err) {
    if (err.message.includes("unique constraint")) {
      return res.status(400).json({ error: "Tên đăng nhập hoặc email đã được sử dụng" });
    }
    console.error("Register Error:", err);
    res.status(500).json({ error: "Đăng ký thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/login`, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu" });

  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `select id, username, email, display_name as "displayName", role, password_hash, created_at as "createdAt", is_active as "isActive", education_level as "educationLevel", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate"
       from users where lower(username) = lower($1)`,
      [username.trim()]
    );


    const user = rows[0];
    if (!user || user.password_hash !== passwordHash) {
      return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa." });
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } = await generateTokens(user.id);

    const { password_hash: _, ...safeUser } = user;
    res.json({ ...safeUser, sessionToken: accessToken, refreshToken, accessTokenExpiresAt });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Đăng nhập thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/refresh-token`, async (req, res) => {
  const { userId, refreshToken } = req.body || {};
  if (!userId || !refreshToken) return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin" });

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return res.status(400).json({ error: "ID người dùng không hợp lệ" });
  }

  try {
    const { rows } = await query(
      `select refresh_token, refresh_token_expires_at from users where id = $1`,
      [userId]
    );

    const user = rows[0];
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ error: "Refresh token không hợp lệ" });
    }

    if (new Date() > new Date(user.refresh_token_expires_at)) {
      return res.status(401).json({ error: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });
    }

    const { accessToken, refreshToken: newRefresh, accessTokenExpiresAt } = await generateTokens(userId);
    res.json({ sessionToken: accessToken, refreshToken: newRefresh, accessTokenExpiresAt });
  } catch (err) {
    console.error("Refresh Token Error:", err);
    res.status(500).json({ error: "Làm mới token thất bại, vui lòng thử lại sau" });
  }
});

function generateRandomPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return res;
}

app.post(`${API_PREFIX}/forgot-password`, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Vui lòng nhập địa chỉ email." });
  }

  try {
    // 1. Kiểm tra email có tồn tại không
    const { rows } = await query(`select id, username from users where lower(email) = lower($1)`, [email.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Email không tồn tại trong hệ thống." });
    }

    const user = rows[0];
    const newPassword = generateRandomPassword(8);
    const passwordHash = await hashPassword(newPassword);

    // 2. Cập nhật mật khẩu mới
    await query(`update users set password_hash = $1 where id = $2`, [passwordHash, user.id]);

    // 3. Gửi email
    const subject = "[Smart Learn] – Khôi phục mật khẩu thành công";
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2D9B63; border-bottom: 2px solid #2D9B63; padding-bottom: 10px;">Xin chào ${user.username},</h2>
          <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn trên <b>Smart Learn</b>.</p>
          <p>Mật khẩu mới của bạn là: <b style="font-size: 1.2em; color: #C08447; background: #fdf6ec; padding: 5px 10px; border-radius: 4px;">${newPassword}</b></p>
          <p>Vui lòng đăng nhập bằng mật khẩu này và đổi lại mật khẩu mới trong phần cài đặt trang cá nhân để bảo mật hơn.</p>
          <p>Hãy đăng nhập để bắt đầu bài học đầu tiên ngay. Chúc bạn học tốt, <b>Smart Learn</b> luôn đồng hành cùng bạn!</p>
          
          <div style="background: #fff4e6; padding: 15px; border-radius: 8px; border-left: 4px solid #f08c00; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #d9480f;">Lưu ý quan trọng:</p>
            <p style="margin: 5px 0 0 0;">Để đảm bảo an toàn, vui lòng không chia sẻ thông tin đăng nhập với bất kỳ ai.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 0.9em; color: #666; font-style: italic;">Trân trọng,<br />Hệ thống hỗ trợ <b>Smart Learn</b></p>

          <div style="margin-top: 20px; font-size: 0.85em; color: #555;">
            <p style="margin-bottom: 5px;">Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi:</p>
            <p style="margin: 0;"><b>Zalo:</b> 0399887380</p>
            <p style="margin: 0;"><b>Email:</b> support.smart.learn@gmail.com</p>
            <p style="margin: 0;"><b>Fanpage:</b> <a href="https://web.facebook.com/profile.php?id=61588811190072" style="color: #2D9B63; text-decoration: none;">Smartlearn</a></p>
          </div>
        </div>
      `;

    await sendMail(email.trim(), subject, html);

    res.json({ message: "Mật khẩu mới đã được gửi vào Email. Truy cập vào Email đăng ký để lấy mật khẩu mới." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Có lỗi xảy ra trong quá trình khôi phục mật khẩu." });
  }
});


// ── Middleware for Data Isolation & Authorization ──────────────────────────
const getUserId = (req) => req.headers["x-user-id"];

async function checkAdmin(userId) {
  if (!userId) return false;
  try {
    const { rows } = await query(`select role from users where id = cast($1 as uuid)`, [userId]);
    return rows[0]?.role === "admin";
  } catch (err) {
    return false;
  }
}

// ── Current User Profile ──────────────────────────────────────────────────
app.get(`${API_PREFIX}/me`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });
  try {
    const { rows } = await query(
      `select id, username, email, display_name as "displayName", role, education_level as "educationLevel", avatar_url as "avatarUrl", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"
       from users where id = $1`,
      [userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy thông tin người dùng" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /me Error:", err.message);
    res.status(500).json({ error: "Lấy thông tin người dùng thất bại, vui lòng thử lại sau" });
  }
});

// ── Statistics (Admin) ─────────────────────────────────────────────────────
app.get(`${API_PREFIX}/statistics/users`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Chỉ quản trị viên mới có quyền truy cập" });

  try {
    const { rows } = await query(`
      SELECT 
        u.id, 
        u.username, 
        u.display_name as "displayName", 
        u.plan, 
        u.plan_end_date::text as "planEndDate", 
        u.last_login::text as "lastLogin",
        COALESCE(c_counts.lesson_count, 0)::int as "lessonCount",
        COALESCE(q_counts.flashcard_count, 0)::int as "flashcardCount",
        COALESCE(e_counts.quiz_count, 0)::int as "quizCount"
      FROM users u
      LEFT JOIN (
        SELECT c.user_id, COUNT(l.id) as lesson_count
        FROM curricula c
        JOIN lessons l ON c.id = l.curriculum_id
        GROUP BY c.user_id
      ) c_counts ON u.id = c_counts.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(id) as flashcard_count FROM quizlet_sets GROUP BY user_id
      ) q_counts ON u.id = q_counts.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(id) as quiz_count FROM exams GROUP BY user_id
      ) e_counts ON u.id = e_counts.user_id
      ORDER BY u.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /statistics/users Error:", err);
    try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] GET /statistics/users Error: ${err.message}\n${err.stack}\n`); } catch (e) { }
    res.status(500).json({ error: "Lấy thống kê người dùng thất bại, vui lòng thử lại sau", details: err.message });
  }
});

app.get(`${API_PREFIX}/statistics/monthly-summary`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Chỉ quản trị viên mới có quyền truy cập" });

  try {
    const { rows } = await query(`
      WITH months AS (
        SELECT 
          date_trunc('month', CURRENT_DATE) as current_month_start,
          date_trunc('month', CURRENT_DATE - interval '1 month') as previous_month_start
      )
      SELECT 
        (SELECT count(*) FROM users WHERE created_at >= (SELECT current_month_start FROM months))::int as current_new_users,
        (SELECT count(*) FROM users WHERE last_login >= (SELECT current_month_start FROM months))::int as current_login_users,
        (SELECT count(*) FROM deleted_users WHERE deleted_at >= (SELECT current_month_start FROM months))::int as current_deleted_users,
        
        (SELECT count(*) FROM users WHERE created_at >= (SELECT previous_month_start FROM months) AND created_at < (SELECT current_month_start FROM months))::int as previous_new_users,
        (SELECT count(*) FROM users WHERE last_login >= (SELECT previous_month_start FROM months) AND last_login < (SELECT current_month_start FROM months))::int as previous_login_users,
        (SELECT count(*) FROM deleted_users WHERE deleted_at >= (SELECT previous_month_start FROM months) AND deleted_at < (SELECT current_month_start FROM months))::int as previous_deleted_users
    `);

    const result = {
      currentMonth: {
        newUsers: rows[0]?.current_new_users || 0,
        loginUsers: rows[0]?.current_login_users || 0,
        deletedUsers: rows[0]?.current_deleted_users || 0
      },
      previousMonth: {
        newUsers: rows[0]?.previous_new_users || 0,
        loginUsers: rows[0]?.previous_login_users || 0,
        deletedUsers: rows[0]?.previous_deleted_users || 0
      }
    };
    res.json(result);
  } catch (err) {
    console.error("GET /statistics/monthly-summary Error:", err);
    res.status(500).json({ error: "Lấy thống kê hàng tháng thất bại, vui lòng thử lại sau", details: err.message });
  }
});

// ── User Management (Admin) ────────────────────────────────────────────────
app.get(`${API_PREFIX}/users`, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const { username, level, role, plan } = req.query;

    let whereClause = [];
    let params = [];
    let paramIdx = 1;

    if (username) {
      whereClause.push(`(username ILIKE $${paramIdx} OR display_name ILIKE $${paramIdx})`);
      params.push(`%${username}%`);
      paramIdx++;
    }
    if (level) {
      whereClause.push(`education_level = $${paramIdx}`);
      params.push(level);
      paramIdx++;
    }
    if (role) {
      whereClause.push(`role = $${paramIdx}`);
      params.push(role);
      paramIdx++;
    }
    if (plan) {
      if (plan === "Miễn phí") {
        whereClause.push(`(plan = $${paramIdx} OR plan IS NULL)`);
      } else {
        whereClause.push(`plan = $${paramIdx}`);
      }
      params.push(plan);
      paramIdx++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(" AND ")}` : "";

    // Fetch users with data transformation
    const { rows: users } = await query(
      `select id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"
       from users 
       ${whereStr}
       order by created_at desc 
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    // Fetch total count for pagination
    const { rows: countRows } = await query(`SELECT count(*) as count FROM users ${whereStr}`, params);
    const totalCount = parseInt(countRows[0].count);

    // Fetch statistics (global totals) - Use CASE WHEN for maximum compatibility
    const { rows: statsRows } = await query(
      `SELECT 
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as users,
        COUNT(*) as total
       FROM users`
    );
    const stats = {
      adminCount: parseInt(statsRows[0]?.admins || 0),
      userCount: parseInt(statsRows[0]?.users || 0),
      totalCount: parseInt(statsRows[0]?.total || 0)
    };

    res.json({
      users,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      page,
      limit,
      stats
    });
  } catch (err) {
    console.error("GET /users Error:", err);
    try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] GET /users Error: ${err.message}\n${err.stack}\n`); } catch (e) { }
    res.status(500).json({ error: "Lấy danh sách người dùng thất bại, vui lòng thử lại sau", details: err.message });
  }
});

app.post(`${API_PREFIX}/users`, async (req, res) => {
  let { username, email, password, display_name, role = "user", education_level, plan = "Miễn phí", plan_start_date, plan_end_date } = req.body || {};
  if (!username?.trim() || !password) return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin bắt buộc" });

  // Thiết lập mặc định nếu chưa có ngày bắt đầu/kết thúc
  if (!plan_start_date) {
    plan_start_date = new Date().toISOString();
  }
  if (!plan_end_date || plan_end_date === "") {
    // Tra cứu duration_days từ subscription_plans thay vì hardcode
    let daysToAdd = 6; // fallback mặc định
    try {
      const { rows: planRows } = await query(
        `SELECT duration_days FROM subscription_plans WHERE name = $1 AND is_active = true LIMIT 1`,
        [plan]
      );
      if (planRows.length > 0) {
        daysToAdd = planRows[0].duration_days;
      }
    } catch (e) {
      console.error("Failed to fetch plan duration for admin user creation, fallback to 6 days:", e);
    }
    const defaultEnd = new Date(plan_start_date);
    defaultEnd.setDate(defaultEnd.getDate() + daysToAdd);
    plan_end_date = defaultEnd.toISOString();
  }

  try {
    const hash = await hashPassword(password);
    const { rows } = await query(
      `insert into users (username, email, password_hash, display_name, role, education_level, plan, plan_start_date, plan_end_date)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"`,
      [username.trim(), email?.trim() || "", hash, display_name?.trim() || username.trim(), role, education_level || null, plan, plan_start_date, plan_end_date]
    );

    const newUser = rows[0];

    // Gửi email xác nhận đăng ký thành công cho tài khoản mới do Admin tạo
    if (newUser && newUser.email) {
      sendRegistrationEmail(newUser.email, newUser.displayName).catch(err => {
        console.error("Failed to send registration email (Admin Create):", err);
      });
    }

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Tạo người dùng thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/users/:id`, async (req, res) => {
  const { id } = req.params;
  const currentUserId = getUserId(req);
  const isAdmin = await checkAdmin(currentUserId);

  if (!isAdmin && currentUserId !== id) {
    return res.status(403).json({ error: "Bạn chỉ có thể xóa tài khoản của chính mình" });
  }

  const { reason } = req.body || {};

  try {
    const { rows } = await query(`select username from users where id = $1`, [id]);
    if (rows[0]?.username === "adminsmart") {
      return res.status(403).json({ error: "Không thể xóa tài khoản quản trị viên gốc" });
    }

    if (reason) {
      console.log(`[User Deletion] User ${id} (${rows[0]?.username}) is deleting their account. Reason: ${reason}`);
    }

    // Insert into deleted_users for statistics
    await query(`insert into deleted_users (original_id, username) values ($1, $2)`, [id, rows[0]?.username]);

    await query(`delete from users where id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /users/:id error:", err);
    res.status(500).json({ error: "Xóa người dùng thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/users/:id`, async (req, res) => {
  const { id } = req.params;
  const { email, display_name, role, education_level, avatar_url, is_active, plan = "Miễn phí", plan_start_date = null } = req.body || {};
  let { plan_end_date = null } = req.body || {};
  if (plan_end_date === "") plan_end_date = null;
  try {
    const { rows } = await query(
      `update users
       set email = $1, display_name = $2, role = $3, education_level = $4, is_active = $5, plan = $6, plan_start_date = $7, plan_end_date = $8, avatar_url = $9
       where id = $10
       returning id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", avatar_url as "avatarUrl", created_at as "createdAt"`,
      [email?.trim() || "", display_name?.trim() || "", role || "user", education_level || null, is_active ?? true, plan, plan_start_date, plan_end_date, avatar_url || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy thông tin người dùng" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /users/:id Error:", err.message);
    res.status(500).json({ error: "Cập nhật người dùng thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/users/:id/password`, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "Vui lòng nhập mật khẩu mới" });
  try {
    const hash = await hashPassword(password);
    await query(`update users set password_hash = $1 where id = $2`, [hash, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Đổi mật khẩu thất bại, vui lòng thử lại sau" });
  }
});

// ── Subscription Plans ────────────────────────────────────────────────────
app.get(`${API_PREFIX}/plans`, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, duration_days as "durationDays", price, description, is_active as "isActive", sort_order as "sortOrder", is_premium as "isPremium"
       FROM subscription_plans
       WHERE is_active = true
       ORDER BY sort_order ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /plans error:", err);
    try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] GET /plans Error: ${err.message}\n${err.stack}\n`); } catch (e) { }
    res.status(500).json({ error: "Không thể tải danh sách gói cước: " + err.message });
  }
});

app.get(`${API_PREFIX}/admin/plans`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    const { rows } = await query(
      `SELECT id, name, duration_days as "durationDays", price, description, is_active as "isActive", sort_order as "sortOrder", is_premium as "isPremium"
       FROM subscription_plans
       ORDER BY sort_order ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /admin/plans error:", err);
    res.status(500).json({ error: "Không thể tải danh sách gói cước (admin): " + err.message });
  }
});

app.post(`${API_PREFIX}/plans`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { name, durationDays, price, description, isActive = true, sortOrder = 0, isPremium = false } = req.body || {};
  if (!name || durationDays === undefined) return res.status(400).json({ error: "Name and durationDays are required" });

  try {
    const { rows } = await query(
      `INSERT INTO subscription_plans (name, duration_days, price, description, is_active, sort_order, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, duration_days as "durationDays", price, description, is_active as "isActive", sort_order as "sortOrder", is_premium as "isPremium"`,
      [
        name.trim(),
        Number(durationDays),
        Number(price || 0),
        description || null,
        Boolean(isActive),
        Number(sortOrder || 0),
        Boolean(isPremium)
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /plans error:", err);
    if (err.message.includes("unique constraint")) {
      return res.status(400).json({ error: "Tên gói cước đã tồn tại" });
    }
    res.status(500).json({ error: "Không thể tạo gói cước: " + err.message });
  }
});

app.put(`${API_PREFIX}/plans/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { name, durationDays, price, description, isActive, sortOrder, isPremium = false } = req.body || {};
  if (!name || durationDays === undefined) return res.status(400).json({ error: "Name and durationDays are required" });

  try {
    const { rows } = await query(
      `UPDATE subscription_plans 
       SET name = $1, duration_days = $2, price = $3, description = $4, is_active = $5, sort_order = $6, is_premium = $7 
       WHERE id = $8 
       RETURNING id, name, duration_days as "durationDays", price, description, is_active as "isActive", sort_order as "sortOrder", is_premium as "isPremium"`,
      [
        name.trim(),
        Number(durationDays),
        Number(price || 0),
        description || null,
        Boolean(isActive),
        Number(sortOrder || 0),
        Boolean(isPremium),
        id
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Gói cước không tồn tại" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /plans/:id error:", err);
    res.status(500).json({ error: "Không thể cập nhật gói cước: " + err.message });
  }
});

app.delete(`${API_PREFIX}/plans/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`DELETE FROM subscription_plans WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa gói cước thất bại, vui lòng thử lại sau" });
  }
});


// ── System Pages (Static content) ──────────────────────────────────────────
app.get(`${API_PREFIX}/system-pages/:slug`, async (req, res) => {
  const { slug } = req.params;
  try {
    const { rows } = await query(`select * from system_pages where slug = $1`, [slug]);
    if (!rows[0]) return res.json({ title: "", content: "", slug });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lấy nội dung trang thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/system-pages`, async (req, res) => {
  try {
    const { rows } = await query(`select slug, title, updated_at from system_pages order by title asc`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách trang thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/system-pages`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Bạn không có quyền truy cập" });

  const { slug, title, content } = req.body || {};
  if (!slug || !title) return res.status(400).json({ error: "Vui lòng nhập slug và tiêu đề trang" });

  try {
    const { rows } = await query(
      `insert into system_pages (slug, title, content, updated_at)
       values ($1, $2, $3, now())
       on conflict (slug) do update
       set title = EXCLUDED.title, content = EXCLUDED.content, updated_at = now()
       returning *`,
      [slug, title, content || ""]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("POST /system-pages error:", err);
    res.status(500).json({ error: "Cập nhật trang thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/user-subjects`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });

  try {
    const { rows } = await query(
      `select s.id, s.name, s.description, s.icon, s.sort_order, s.created_at, 
              count(c.id)::int as curriculum_count
       from subjects s
       join user_subjects us on s.id = us.subject_id
       left join curricula c on c.subject_id = s.id and c.is_public = true
       where us.user_id = $1
       group by s.id, s.name, s.description, s.icon, s.sort_order, s.created_at
       order by s.sort_order asc, s.created_at desc`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /user-subjects Error:", err.message);
    try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] GET /user-subjects Error: ${err.message}\n${err.stack}\n`); } catch (e) { }
    res.status(500).json({ error: "Lấy danh sách môn học cá nhân thất bại, vui lòng thử lại sau", details: err.message });
  }
});

app.post(`${API_PREFIX}/user-subjects`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });

  const { subject_ids } = req.body || {};
  if (!Array.isArray(subject_ids)) return res.status(400).json({ error: "Danh sách môn học phải là một mảng hợp lệ" });

  try {
    await query("BEGIN");
    await query(`delete from user_subjects where user_id = $1`, [userId]);
    for (const sid of subject_ids) {
      await query(`insert into user_subjects (user_id, subject_id) values ($1, $2)`, [userId, sid]);
    }
    await query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await query("ROLLBACK");
    console.error("POST /user-subjects Error:", err.message);
    res.status(500).json({ error: "Cập nhật môn học cá nhân thất bại, vui lòng thử lại sau" });
  }
});



// ── Timetable ────────────────────────────────────────────────────────────────
app.get(`${API_PREFIX}/timetable`, async (req, res) => {
  const userId = getUserId(req);
  try {
    const { rows: groups } = await query(
      `select * from timetable_groups where user_id = $1 order by sort_order asc, created_at asc`,
      [userId]
    );
    const { rows: entries } = await query(
      `select e.* from timetable_entries e 
       join timetable_groups g on e.group_id = g.id 
       where g.user_id = $1`,
      [userId]
    );

    const result = groups.map(g => ({
      ...g,
      entries: entries.filter(e => e.group_id === g.id)
    }));
    res.json(result);
  } catch (err) {
    console.error("GET /timetable error:", err);
    res.status(500).json({ error: "Lấy thời khóa biểu thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/timetable/groups`, async (req, res) => {
  const userId = getUserId(req);
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Vui lòng nhập tên nhóm" });
  try {
    const { rows } = await query(
      `insert into timetable_groups (user_id, name) values ($1, $2) returning *`,
      [userId, name]
    );
    res.json({ ...rows[0], entries: [] });
  } catch (err) {
    res.status(500).json({ error: "Tạo nhóm thời khóa biểu thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/timetable/groups/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { name, sort_order } = req.body || {};
  try {
    const { rows } = await query(
      `update timetable_groups set name = coalesce($1, name), sort_order = coalesce($2, sort_order) 
       where id = $3 and user_id = $4 returning *`,
      [name, sort_order, id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy nhóm thời khóa biểu" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật nhóm thời khóa biểu thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/timetable/groups/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const { rowCount } = await query(`delete from timetable_groups where id = $1 and user_id = $2`, [id, userId]);
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy nhóm thời khóa biểu" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa nhóm thời khóa biểu thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/timetable/entries`, async (req, res) => {
  const userId = getUserId(req);
  const { group_id, day, subject, start_time, end_time, room, color } = req.body || {};
  if (!group_id || !day || !subject || !start_time || !end_time) {
    return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin bắt buộc" });
  }
  try {
    // Verify group belongs to user
    const { rows: grp } = await query(`select id from timetable_groups where id = $1 and user_id = $2`, [group_id, userId]);
    if (!grp[0]) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });

    const { rows } = await query(
      `insert into timetable_entries (group_id, day, subject, start_time, end_time, room, color) 
       values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [group_id, day, subject, start_time, end_time, room || null, color || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo tiết học thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/timetable/entries/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { day, subject, start_time, end_time, room, color } = req.body || {};
  try {
    const { rows } = await query(
      `update timetable_entries set 
        day = coalesce($1, day), 
        subject = coalesce($2, subject), 
        start_time = coalesce($3, start_time), 
        end_time = coalesce($4, end_time), 
        room = coalesce($5, room), 
        color = coalesce($6, color)
       where id = $7 and group_id in (select id from timetable_groups where user_id = $8)
       returning *`,
      [day, subject, start_time, end_time, room, color, id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy tiết học" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật tiết học thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/timetable/entries/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const { rowCount } = await query(
      `delete from timetable_entries where id = $1 and group_id in (select id from timetable_groups where user_id = $2)`,
      [id, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy tiết học" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa tiết học thất bại, vui lòng thử lại sau" });
  }
});

// ── User Tasks ────────────────────────────────────────────────────────────────
app.get(`${API_PREFIX}/tasks`, async (req, res) => {
  const userId = getUserId(req);
  try {
    const { rows } = await query(`select * from user_tasks where user_id = $1 order by created_at desc`, [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách nhiệm vụ thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/tasks`, async (req, res) => {
  const userId = getUserId(req);
  const { title, description, due_date, completed, priority } = req.body || {};
  if (!title) return res.status(400).json({ error: "Vui lòng nhập tiêu đề nhiệm vụ" });
  try {
    const { rows } = await query(
      `insert into user_tasks (user_id, title, description, due_date, completed, priority) 
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [userId, title, description || null, due_date || null, completed || false, priority || 'medium']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo nhiệm vụ thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/tasks/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { title, description, due_date, completed, priority } = req.body || {};
  try {
    const { rows } = await query(
      `update user_tasks set 
        title = coalesce($1, title), 
        description = coalesce($2, description), 
        due_date = coalesce($3, due_date), 
        completed = coalesce($4, completed), 
        priority = coalesce($5, priority)
       where id = $6 and user_id = $7 returning *`,
      [title, description, due_date, completed, priority, id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật nhiệm vụ thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/tasks/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const { rowCount } = await query(`delete from user_tasks where id = $1 and user_id = $2`, [id, userId]);
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa nhiệm vụ thất bại, vui lòng thử lại sau" });
  }
});

// ── User Notes ────────────────────────────────────────────────────────────────
app.get(`${API_PREFIX}/notes`, async (req, res) => {
  const userId = getUserId(req);
  try {
    const { rows } = await query(`select * from user_notes where user_id = $1 order by updated_at desc`, [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách ghi chú thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/notes`, async (req, res) => {
  const userId = getUserId(req);
  const { title, content, color } = req.body || {};
  try {
    const { rows } = await query(
      `insert into user_notes (user_id, title, content, color) values ($1, $2, $3, $4) returning *`,
      [userId, title || null, content || null, color || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo ghi chú thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/notes/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { title, content, color } = req.body || {};
  try {
    const { rows } = await query(
      `update user_notes set title = coalesce($1, title), content = coalesce($2, content), color = coalesce($3, color), updated_at = now() 
       where id = $4 and user_id = $5 returning *`,
      [title, content, color, id, userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy ghi chú" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật ghi chú thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/notes/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const { rowCount } = await query(`delete from user_notes where id = $1 and user_id = $2`, [id, userId]);
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy ghi chú" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa ghi chú thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/subjects`, async (req, res) => {
  const { mode } = req.query;
  const userId = getUserId(req);

  try {
    let sql;
    let params = [];

    if (mode === "teacher" && userId) {
      sql = `SELECT s.*, 
                    (SELECT count(*)::int FROM curricula c WHERE c.subject_id = s.id AND c.user_id = $1) as curriculum_count
             FROM subjects s
             ORDER BY s.sort_order ASC, s.created_at DESC`;
      params = [userId];
    } else {
      sql = `SELECT s.*, 
                    (SELECT count(*)::int FROM curricula c WHERE c.subject_id = s.id AND c.is_public = true) as curriculum_count
             FROM subjects s
             ORDER BY s.sort_order ASC, s.created_at DESC`;
    }

    const { rows } = await query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error("GET /subjects Error:", err.message);
    res.status(500).json({ error: "Lấy danh sách môn học thất bại, vui lòng thử lại sau", details: err.message });
  }
});

app.get(`${API_PREFIX}/subjects/:id`, async (req, res) => {
  const { mode } = req.query;
  const userId = getUserId(req);

  try {
    let sql;
    let params = [req.params.id];

    if (mode === "teacher" && userId) {
      sql = `SELECT s.*, 
                    (SELECT count(*)::int FROM curricula c WHERE c.subject_id = s.id AND c.user_id = $2) as curriculum_count
             FROM subjects s
             WHERE s.id = $1`;
      params = [req.params.id, userId];
    } else {
      sql = `SELECT s.*, 
                    (SELECT count(*)::int FROM curricula c WHERE c.subject_id = s.id AND c.is_public = true) as curriculum_count
             FROM subjects s
             WHERE s.id = $1`;
    }

    const { rows } = await query(sql, params);

    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy môn học" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /subjects/:id Error:", err.message);
    res.status(500).json({ error: "Lấy thông tin môn học thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/subjects`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Chỉ quản trị viên mới có quyền tạo môn học" });

  const { name, description = null, icon = null, created_by = null } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Vui lòng nhập tên" });
  try {
    const { rows } = await query(
      `insert into subjects (name, description, icon, user_id, created_by, sort_order)
       values ($1, $2, $3, $4, $5, (select coalesce(max(sort_order), -1) + 1 from subjects))
       returning *`,
      [name.trim(), description, icon, userId, created_by]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo môn học thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/subjects/reorder`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });

  const { orders } = req.body || {}; // array of { id, sort_order }
  if (!Array.isArray(orders)) return res.status(400).json({ error: "orders phải là một mảng" });

  try {
    for (const item of orders) {
      await query(`update subjects set sort_order = $1 where id = $2`, [item.sort_order, item.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Sắp xếp lại danh sách môn học thất bại" });
  }
});

app.put(`${API_PREFIX}/subjects/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });

  const { id } = req.params;
  const { name, description = null, icon = null } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Vui lòng nhập tên" });
  try {
    const { rows } = await query(
      `update subjects
       set name = $1, description = $2, icon = $3
       where id = $4
       returning *`,
      [name.trim(), description, icon, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy môn học" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật môn học thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/subjects/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  try {
    await query(`delete from subjects where id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa danh sách môn học thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/curricula`, async (req, res) => {
  const { subject_id } = req.query;
  try {
    const params = [];
    let where = "";
    if (subject_id) {
      params.push(subject_id);
      where = `where c.subject_id = $1`;
    }
    const { rows } = await query(
      `select c.*,
          u.display_name as "authorName",
          u.avatar_url as "authorAvatar",
          u.role as "authorRole",
          (select count(*)::int from lessons l where l.curriculum_id = c.id) as lesson_count
       from curricula c
       left join users u on c.user_id = u.id
       ${where}
       order by c.sort_order asc, c.created_at desc`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /curricula Error:", err.message);
    try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] GET /curricula Error: ${err.message}\n${err.stack}\n`); } catch (e) { }
    res.status(500).json({ error: "Lấy danh sách chương trình học thất bại, vui lòng thử lại sau", details: err.message });
  }
});

app.get(`${API_PREFIX}/curricula/:id`, async (req, res) => {
  try {
    const { rows } = await query(
      `select c.*,
         u.display_name as "authorName",
         u.avatar_url as "authorAvatar",
         u.role as "authorRole",
         (select count(*)::int from lessons l where l.curriculum_id = c.id) as lesson_count
       from curricula c
       left join users u on c.user_id = u.id
       where c.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy chương trình học" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách chương trình học thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/curricula`, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File quá lớn. Giới hạn tối đa là 10MB." });
      }
      return res.status(400).json({ error: err.message || "Upload thất bại." });
    }

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });

    try {
      const {
        subject_id,
        name,
        grade = null,
        education_level = null,
        is_public = false,
        publisher = null,
        lesson_count = 0,
        file_content = null,
        created_by = null,
        image_url = null,
      } = req.body || {};

      if (!subject_id) return res.status(400).json({ error: "subject_id is required" });
      if (!name?.trim()) return res.status(400).json({ error: "name is required" });

      const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const { rows } = await query(
        `insert into curricula
         (subject_id, name, grade, education_level, is_public, publisher, lesson_count, file_url, file_content, image_url, user_id, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning *`,
        [
          subject_id,
          name.trim(),
          grade,
          education_level,
          is_public === "true" || is_public === true,
          publisher,
          Number(lesson_count) || 0,
          fileUrl,
          file_content,
          image_url,
          userId,
          created_by,
        ]
      );

      res.status(201).json(rows[0]);
    } catch (dbErr) {
      console.error("POST /curricula Error:", dbErr.message);
      res.status(500).json({ error: "Tạo giáo trình thất bại, vui lòng thử lại sau" });
    }
  });
});

app.put(`${API_PREFIX}/curricula/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });

  const { id } = req.params;
  const isAdmin = await checkAdmin(userId);
  const { rows: ownerRows } = await query(`select user_id from curricula where id = $1`, [id]);
  if (!ownerRows[0]) return res.status(404).json({ error: "Không tìm thấy chương trình học" });

  const isOwner = ownerRows[0].user_id === userId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });

  const {
    name,
    grade = null,
    education_level = null,
    is_public = false,
    publisher = null,
    lesson_count = 0,
    file_url = null,
    file_content = null,
    image_url = null,
  } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Vui lòng nhập tên" });

  try {
    const { rows } = await query(
      `update curricula
       set name = $1, grade = $2, education_level = $3, is_public = $4, publisher = $5, lesson_count = $6, file_url = $7, file_content = $8, image_url = $9
       where id = $10
       returning *`,
      [name.trim(), grade, education_level, is_public, publisher, Number(lesson_count) || 0, file_url, file_content, image_url, id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy chương trình học" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật chương trình học thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/curricula/reorder`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });

  // For reorder, ideally we check if user owns all curricula they are reordering
  // For now, allow any logged in user as they only see their own anyway in the UI
  // But ideally we'd verify each ID in the loop. For local/low-risk, this is OK.

  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: "Định dạng thứ tự không hợp lệ" });

    // Update each curriculum's sort_order based on the provided array
    for (let i = 0; i < order.length; i++) {
      await query(`update curricula set sort_order = $1 where id = $2`, [i, order[i]]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi sắp xếp lại chương trình học:", err);
    res.status(500).json({ error: "Sắp xếp lại chương trình học thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/curricula/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Bạn không có quyền truy cập" });

  const { id } = req.params;
  const isAdmin = await checkAdmin(userId);
  const { rows: ownerRows } = await query(`select user_id from curricula where id = $1`, [id]);
  if (!ownerRows[0]) return res.status(204).send(); // Gone already

  const isOwner = ownerRows[0].user_id === userId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });

  try {
    await query(`delete from curricula where id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa chương trình học thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/lessons`, async (req, res) => {
  const { curriculum_id } = req.query;
  try {
    const params = [];
    let where = "";
    if (curriculum_id) {
      params.push(curriculum_id);
      where = `where l.curriculum_id = $${params.length}`;
    }
    const { rows } = await query(
      `select l.*,
         coalesce((
           select jsonb_agg(
             jsonb_build_object(
               'id', q.id::text,
               'question', q.question,
               'options', q.options,
               'correctIndex', q.correct_index,
               'explanation', q.explanation
             )
             order by q.created_at
           )
           from quiz_questions q where q.lesson_id = l.id
         ), '[]'::jsonb) as quiz,
         coalesce((
           select jsonb_agg(
             jsonb_build_object(
               'id', f.id::text,
               'front', f.front,
               'back', f.back
             )
             order by f.created_at
           )
           from flashcards f where f.lesson_id = l.id
         ), '[]'::jsonb) as flashcards
       from lessons l
       ${where}
       order by l.sort_order asc, l.created_at asc`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách bài học thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/lessons/:id`, async (req, res) => {
  try {
    const { rows } = await query(
      `select l.*,
         coalesce((
           select jsonb_agg(
             jsonb_build_object(
               'id', q.id::text,
               'question', q.question,
               'options', q.options,
               'correctIndex', q.correct_index,
               'explanation', q.explanation
             )
             order by q.created_at
           )
           from quiz_questions q where q.lesson_id = l.id
         ), '[]'::jsonb) as quiz,
         coalesce((
           select jsonb_agg(
             jsonb_build_object(
               'id', f.id::text,
               'front', f.front,
               'back', f.back
             )
             order by f.created_at
           )
           from flashcards f where f.lesson_id = l.id
         ), '[]'::jsonb) as flashcards
       from lessons l
       where l.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy bài học" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách bài học thất bại" });
  }
});

app.post(`${API_PREFIX}/lessons`, async (req, res) => {
  const {
    curriculum_id,
    title,
    description = null,
    content = [],
    summary = null,
    key_points = [],
    vocabulary = [],
    sort_order = 0,
  } = req.body || {};
  if (!curriculum_id) return res.status(400).json({ error: "Vui lòng cung cấp ID chương trình học" });
  if (!title?.trim()) return res.status(400).json({ error: "Vui lòng nhập tiêu đề" });

  try {
    const { rows } = await query(
      `insert into lessons
       (curriculum_id, title, description, content, summary, key_points, vocabulary, sort_order)
       values ($1, $2, $3, $4::jsonb, $5, $6::text[], $7::jsonb, $8)
       returning *`,
      [
        curriculum_id,
        title.trim(),
        description,
        JSON.stringify(content || []),
        summary,
        key_points || [],
        JSON.stringify(vocabulary || []),
        Number(sort_order) || 0,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo bài học thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/lessons/:id`, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description = null,
    content = [],
    summary = null,
    key_points = [],
    vocabulary = [],
    sort_order = 0,
  } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "Vui lòng nhập tiêu đề" });
  try {
    const { rows } = await query(
      `update lessons
       set title = $1,
           description = $2,
           content = $3::jsonb,
           summary = $4,
           key_points = $5::text[],
           vocabulary = $6::jsonb,
           sort_order = $7
       where id = $8
       returning *`,
      [
        title.trim(),
        description,
        JSON.stringify(content || []),
        summary,
        key_points || [],
        JSON.stringify(vocabulary || []),
        Number(sort_order) || 0,
        id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy bài học" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật bài học thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/lessons/:id`, async (req, res) => {
  try {
    await query(`delete from lessons where id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa bài học thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/lessons/:id/quiz-flashcards`, async (req, res) => {
  const { id } = req.params;
  const quiz = Array.isArray(req.body?.quiz) ? req.body.quiz : [];
  const flashcards = Array.isArray(req.body?.flashcards) ? req.body.flashcards : [];
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from quiz_questions where lesson_id = $1`, [id]);
    await client.query(`delete from flashcards where lesson_id = $1`, [id]);

    for (const q of quiz) {
      await client.query(
        `insert into quiz_questions (lesson_id, question, options, correct_index, explanation)
         values ($1, $2, $3::text[], $4, $5)`,
        [
          id,
          q.question || "",
          Array.isArray(q.options) ? q.options : [],
          Number(q.correctIndex) || 0,
          q.explanation || "",
        ]
      );
    }

    for (const f of flashcards) {
      await client.query(
        `insert into flashcards (lesson_id, front, back)
         values ($1, $2, $3)`,
        [id, f.front || "", f.back || ""]
      );
    }

    await client.query("commit");
    res.json({ ok: true });
  } catch (err) {
    await client.query("rollback");
    res.status(500).json({ error: "Lưu bài kiểm tra/thẻ học thất bại, vui lòng thử lại sau" });
  } finally {
    client.release();
  }
});

// ── Lesson Images ─────────────────────────────────────────────────────────
app.get(`${API_PREFIX}/lessons/:id/images`, async (req, res) => {
  try {
    const { rows } = await query(
      `select id::text, lesson_id::text, file_url, caption, sort_order, created_at
       from lesson_images
       where lesson_id = $1
       order by sort_order asc, created_at asc`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy ảnh bài học thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/lessons/:id/images`, (req, res) => {
  upload.array("images", 20)(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File quá lớn. Giới hạn tối đa là 10MB mỗi ảnh." });
      }
      return res.status(400).json({ error: err.message || "Upload thất bại." });
    }

    const { id } = req.params;
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: "Vui lòng chọn ít nhất một file để tải lên" });

    try {
      // Get current max sort_order
      const { rows: maxRows } = await query(
        `select coalesce(max(sort_order), -1) as max_order from lesson_images where lesson_id = $1`,
        [id]
      );
      let sortOrder = (maxRows[0]?.max_order ?? -1) + 1;

      const inserted = [];
      for (const file of files) {
        const fileUrl = `/uploads/${file.filename}`;
        const { rows } = await query(
          `insert into lesson_images (lesson_id, file_url, sort_order)
           values ($1, $2, $3)
           returning id::text, lesson_id::text, file_url, caption, sort_order, created_at`,
          [id, fileUrl, sortOrder++]
        );
        inserted.push(rows[0]);
      }
      res.status(201).json(inserted);
    } catch (dbErr) {
      console.error("POST /lessons/:id/images Error:", dbErr.message);
      res.status(500).json({ error: "Tải ảnh bài học thất bại, vui lòng thử lại sau" });
    }
  });
});

app.delete(`${API_PREFIX}/lessons/:id/images/:imageId`, async (req, res) => {
  const { imageId } = req.params;
  try {
    const { rows } = await query(
      `delete from lesson_images where id = $1 returning file_url`,
      [imageId]
    );
    if (rows[0]?.file_url) {
      const filePath = path.join(projectRoot, rows[0].file_url);
      await fs.unlink(filePath).catch(() => { });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa ảnh bài học thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/progress`, async (req, res) => {
  const studentId = String(req.query.student_id || "").trim();
  if (!studentId) return res.status(400).json({ error: "Vui lòng cung cấp ID học sinh" });
  try {
    const { rows } = await query(
      `select lesson_id::text as lesson_id, completed, completed_at
       from lesson_progress
       where student_id = $1`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy tiến độ học tập thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/progress/:lessonId`, async (req, res) => {
  const { lessonId } = req.params;
  const studentId = String(req.body?.student_id || "").trim();
  const completed = Boolean(req.body?.completed);
  if (!studentId) return res.status(400).json({ error: "Vui lòng cung cấp ID học sinh" });
  try {
    const { rows } = await query(
      `insert into lesson_progress (student_id, lesson_id, completed, completed_at)
       values ($1, $2::uuid, $3, case when $3 then now() else null end)
       on conflict (student_id, lesson_id)
       do update set completed = excluded.completed,
                     completed_at = case when excluded.completed then now() else null end
       returning lesson_id::text as lesson_id, completed, completed_at`,
      [studentId, lessonId, completed]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lưu tiến độ học tập thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/quizlets`, async (req, res) => {
  const userId = getUserId(req);
  const { tab } = req.query;

  try {
    const { rows: userRows } = await query('select role, education_level from users where id = cast($1 as uuid)', [userId]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "Không tìm thấy thông tin người dùng" });

    const isAdmin = user.role === "admin";
    const userLevelStr = String(user.education_level || "");

    let rows;
    if (tab === "personal") {
      const result = await query(
        `select q.*, 
          s.name as subject_name,
          (select count(*)::int from quizlet_terms t where t.quizlet_set_id = q.id) as term_count,
          coalesce(u.display_name, q.created_by, 'Người dùng ẩn danh') as author_name
         from quizlet_sets q
         left join users u on q.user_id = u.id
         left join subjects s on q.subject_id = s.id
         where q.user_id = $1::uuid
         order by s.name asc, q.created_at desc`,
        [userId]
      );
      rows = result.rows;
    } else if (tab === "community") {
      const sql = `select q.*, 
          s.name as subject_name,
          (select count(*)::int from quizlet_terms t where t.quizlet_set_id = q.id) as term_count,
          coalesce(u.display_name, q.created_by, 'Người dùng ẩn danh') as author_name
         from quizlet_sets q
         left join users u on q.user_id = u.id
         left join subjects s on q.subject_id = s.id
         where q.is_public = true ${isAdmin ? "" : "and q.education_level = cast($1 as text)"}
         order by s.name asc, q.created_at desc`;

      const result = await query(sql, isAdmin ? [] : [userLevelStr]);
      rows = result.rows;
    } else {
      const result = await query(
        `select q.*, 
          s.name as subject_name,
          (select count(*)::int from quizlet_terms t where t.quizlet_set_id = q.id) as term_count,
          coalesce(u.display_name, q.created_by, 'Người dùng ẩn danh') as author_name
         from quizlet_sets q
         left join users u on q.user_id = u.id
         left join subjects s on q.subject_id = s.id
         where (cast($2 as boolean) = true or q.user_id = cast($1 as uuid) or q.is_public = true)
         order by s.name asc, q.created_at desc`,
        [userId, isAdmin]
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách bộ thẻ học thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/quizlets`, async (req, res) => {
  const { title, description = null, subject_id = null, grade = null, education_level = null, is_public = false, created_by = null, terms = [] } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "Vui lòng nhập tiêu đề" });

  try {
    const userId = getUserId(req);
    const { rows: setRows } = await query(
      `insert into quizlet_sets (title, description, subject_id, grade, education_level, is_public, created_by, user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [title.trim(), description, subject_id, grade, education_level, is_public, created_by, userId]
    );

    const setId = setRows[0].id;
    for (const term of terms) {
      await query(
        `insert into quizlet_terms (quizlet_set_id, term, definition, image_url, sort_order)
         values ($1, $2, $3, $4, $5)`,
        [setId, term.term.trim(), term.definition.trim(), term.image_url, term.sort_order || 0]
      );
    }
    res.status(201).json({ id: setId });
  } catch (err) {
    res.status(500).json({ error: "Tạo bộ thẻ học thất bại, vui lòng thử lại sau" });
  }
});

app.get(`${API_PREFIX}/quizlets/:id`, async (req, res) => {
  const userId = getUserId(req);
  try {
    const isAdmin = await checkAdmin(userId);
    const { rows: setRows } = await query(
      `select q.*, s.name as subject_name 
       from quizlet_sets q 
       left join subjects s on q.subject_id = s.id 
       where q.id = $1 and ($2 = true or q.user_id = $3 or q.is_public = true)`,
      [req.params.id, isAdmin, userId]
    );

    if (!setRows[0]) return res.status(404).json({ error: "Không tìm thấy bộ thẻ học hoặc bạn không có quyền truy cập" });

    const { rows: termRows } = await query(
      `select * from quizlet_terms where quizlet_set_id = $1 order by sort_order asc`,
      [req.params.id]
    );

    res.json({ ...setRows[0], terms: termRows });
  } catch (err) {
    res.status(500).json({ error: "Lấy bộ thẻ học thất bại, vui lòng thử lại sau" });
  }
});

app.put(`${API_PREFIX}/quizlets/:id`, async (req, res) => {
  const { id } = req.params;
  const { title, description = null, subject_id = null, grade = null, education_level = null, is_public = false, terms = [] } = req.body || {};

  try {
    const userId = getUserId(req);
    const isAdmin = await checkAdmin(userId);

    // Check ownership
    const { rows: setRows } = await query(`select user_id from quizlet_sets where id = $1`, [id]);
    if (setRows.length === 0) return res.status(404).json({ error: "Không tìm thấy bộ thẻ học" });
    if (!isAdmin && setRows[0].user_id !== userId) return res.status(403).json({ error: "Bạn không có quyền thực hiện thao tác này" });

    await query(
      `update quizlet_sets set title = $1, description = $2, subject_id = $3, grade = $4, education_level = $5, is_public = $6
       where id = $7`,
      [title.trim(), description, subject_id, grade, education_level, is_public, id]
    );

    // Update terms: simple way is delete and re-insert
    await query(`delete from quizlet_terms where quizlet_set_id = $1`, [id]);
    for (const term of terms) {
      await query(
        `insert into quizlet_terms (quizlet_set_id, term, definition, image_url, sort_order)
         values ($1, $2, $3, $4, $5)`,
        [id, term.term.trim(), term.definition.trim(), term.image_url, term.sort_order || 0]
      );
    }
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Cập nhật bộ thẻ học thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/quizlets/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const userId = getUserId(req);
    const isAdmin = await checkAdmin(userId);

    // Check if the set exists and is owned by the user or if the user is an admin
    const { rows } = await query(`select id from quizlet_sets where id = $1 and ($2 = true or user_id = $3)`, [id, isAdmin, userId]);
    if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy bộ thẻ học" });

    // Delete terms first (if not cascading)
    await query(`delete from quizlet_terms where quizlet_set_id = $1`, [id]);
    await query(`delete from quizlet_sets where id = $1`, [id]);
    res.status(204).send();

  } catch (err) {
    res.status(500).json({ error: "Xóa bộ thẻ học thất bại, vui lòng thử lại sau" });
  }
});

// ── Exams (Trắc nghiệm) ──────────────────────────────────────────────────
app.get(`${API_PREFIX}/exams`, async (req, res) => {
  const userId = getUserId(req);
  const { tab } = req.query;

  try {
    const { rows: userRows } = await query('select role, education_level from users where id = cast($1 as uuid)', [userId]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "Không tìm thấy thông tin người dùng" });

    const isAdmin = user.role === "admin";
    const userLevelStr = String(user.education_level || "");

    let rows;
    if (tab === "personal") {
      const result = await query(
        `select e.*, 
         s.name as subject_name,
         (select count(*) from exam_questions where exam_id = e.id) as question_count,
         (select round(avg(score)) from exam_results where exam_id = e.id and user_id = $1::uuid) as average_score,
         u.display_name as author_name
         from exams e 
         left join users u on e.user_id = u.id
         left join subjects s on e.subject_id = s.id
         where e.user_id = $1::uuid and e.is_repository = false
         order by e.created_at desc`,
        [userId]
      );
      rows = result.rows;
    } else if (tab === "community") {
      const sql = `select e.*, 
         s.name as subject_name,
         (select count(*) from exam_questions where exam_id = e.id) as question_count,
         (select round(avg(score)) from exam_results where exam_id = e.id and user_id = cast($1 as uuid)) as average_score,
         u.display_name as author_name
         from exams e 
         left join users u on e.user_id = u.id
         left join subjects s on e.subject_id = s.id
         where e.is_public = true and e.is_repository = false ${isAdmin ? "" : "and e.education_level = cast($2 as text)"}
         order by e.created_at desc`;

      const params = isAdmin ? [userId] : [userId, userLevelStr];
      const result = await query(sql, params);
      rows = result.rows;
    } else {
      const result = await query(
        `select e.*, 
         s.name as subject_name,
         (select count(*) from exam_questions where exam_id = e.id) as question_count,
         (select round(avg(score)) from exam_results where exam_id = e.id and user_id = $1::uuid) as average_score,
         u.display_name as author_name
         from exams e 
         left join users u on e.user_id = u.id
         left join subjects s on e.subject_id = s.id
         where ($2::boolean = true or e.user_id = $1::uuid or e.is_public = true) and e.is_repository = false
         order by e.created_at desc`,
        [userId, isAdmin]
      );
      rows = result.rows;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách trắc nghiệm thất bại" });
  }
});

app.get(`${API_PREFIX}/exams/:id`, async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  try {
    const isAdmin = await checkAdmin(userId);
    const { rows: exams } = await query(
      `select * from exams where id = $1 and ($2 = true or user_id = $3 or is_public = true)`,
      [id, isAdmin, userId]
    );
    if (exams.length === 0) return res.status(404).json({ error: "Không tìm thấy đề thi hoặc bạn không có quyền truy cập" });

    const { rows: questions } = await query(
      `select * from exam_questions where exam_id = $1 order by sort_order`,
      [id]
    );

    for (const q of questions) {
      const { rows: options } = await query(
        `select * from exam_options where question_id = $1 order by sort_order`,
        [q.id]
      );
      q.options = options;
    }

    res.json({ ...exams[0], questions });
  } catch (err) {
    res.status(500).json({ error: "Lấy chi tiết đề thi thất bại, vui lòng thử lại sau" });
  }
});

app.delete(`${API_PREFIX}/exams/:id`, async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  try {
    const isAdmin = await checkAdmin(userId);
    const { rowCount } = await query(
      `delete from exams where id = $1 and ($2 = true or user_id = $3)`,
      [id, isAdmin, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy đề thi hoặc bạn không có quyền truy cập" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa đề thi thất bại, vui lòng thử lại sau" });
  }
});

app.post(`${API_PREFIX}/exams`, async (req, res) => {
  const userId = getUserId(req);
  const { title, description, duration, subject_id, grade = null, education_level = null, is_public = true, questions } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: examRows } = await client.query(
      `insert into exams (title, description, duration, subject_id, grade, education_level, is_public, user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [title, description, duration, subject_id || null, grade, education_level, is_public, userId]
    );
    const examId = examRows[0].id;

    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { rows: qRows } = await client.query(
          `insert into exam_questions (exam_id, content, type, sort_order)
           values ($1, $2, $3, $4) returning id`,
          [examId, q.content, q.type, i]
        );
        const qId = qRows[0].id;

        if (q.options && Array.isArray(q.options)) {
          for (let j = 0; j < q.options.length; j++) {
            const opt = q.options[j];
            await client.query(
              `insert into exam_options (question_id, content, is_correct, sort_order)
               values ($1, $2, $3, $4)`,
              [qId, opt.content, opt.is_correct || false, j]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ id: examId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Tạo đề thi thất bại, vui lòng thử lại sau" });
  } finally {
    client.release();
  }
});

app.put(`${API_PREFIX}/exams/:id`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { title, description, duration, subject_id, grade = null, education_level = null, is_public = true, questions } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const isAdmin = await checkAdmin(userId);
    const { rowCount } = await client.query(
      `update exams 
       set title = $1, description = $2, duration = $3, subject_id = $4, grade = $5, education_level = $6, is_public = $7
       where id = $8 and ($9 = true or user_id = $10)`,
      [title, description, duration, subject_id || null, grade, education_level, is_public, id, isAdmin, userId]
    );

    if (rowCount === 0) {
      throw new Error("Không tìm thấy đề thi hoặc bạn không có quyền truy cập");
    }

    // Delete old questions/options (cascading)
    await client.query(`delete from exam_questions where exam_id = $1`, [id]);

    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { rows: qRows } = await client.query(
          `insert into exam_questions (exam_id, content, type, sort_order)
           values ($1, $2, $3, $4) returning id`,
          [id, q.content, q.type, i]
        );
        const qId = qRows[0].id;

        if (q.options && Array.isArray(q.options)) {
          for (let j = 0; j < q.options.length; j++) {
            const opt = q.options[j];
            await client.query(
              `insert into exam_options (question_id, content, is_correct, sort_order)
               values ($1, $2, $3, $4)`,
              [qId, opt.content, opt.is_correct || false, j]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message || "Cập nhật đề thi thất bại, vui lòng thử lại sau" });
  } finally {
    client.release();
  }
});


app.post(`${API_PREFIX}/exams/:id/results`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { score, timeTaken } = req.body || {};

  if (score === undefined || timeTaken === undefined) {
    return res.status(400).json({ error: "Vui lòng cung cấp điểm số và thời gian làm bài" });
  }

  try {
    const { rows } = await query(
      `insert into exam_results (exam_id, user_id, score, time_taken)
       values ($1, $2, $3, $4) returning id`,
      [id, userId, score, timeTaken]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lưu kết quả thi thất bại, vui lòng thử lại sau" });
  }
});


// ── Quiz Question Repository ───────────────────────────────────────────
app.get(`${API_PREFIX}/questions`, async (req, res) => {
  const userId = getUserId(req);
  const isAdmin = await checkAdmin(userId);
  const isTeacher = await (async () => {
    const { rows } = await query('select role from users where id = cast($1 as uuid)', [userId]);
    return rows[0]?.role === "teacher";
  })();

  if (!isAdmin && !isTeacher) {
    return res.status(403).json({ error: "Chỉ dành cho quản trị viên và giáo viên" });
  }

  try {
    let sql = `
      SELECT 
        eq.id, 
        eq.content, 
        eq.type, 
        eq.exam_id,
        e.subject_id,
        eq.category,
        eq.is_system,
        e.education_level, 
        e.grade, 
        s.name as subject_name, 
        u.display_name as creator_name, 
        eq.created_at,
        (
          SELECT jsonb_agg(jsonb_build_object('content', eo.content, 'is_correct', eo.is_correct, 'id', eo.id) ORDER BY eo.sort_order)
          FROM exam_options eo 
          WHERE eo.question_id = eq.id
        ) as options

      FROM exam_questions eq
      JOIN exams e ON eq.exam_id = e.id
      LEFT JOIN subjects s ON e.subject_id = s.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE eq.is_repository = true
    `;

    const params = [];
    if (!isAdmin) {
      sql += " AND e.user_id = $1";
      params.push(userId);
    }

    sql += " ORDER BY eq.created_at DESC";

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /questions Error:", err);
    res.status(500).json({ error: "Không thể lấy danh sách kho câu hỏi" });
  }
});

app.delete(`${API_PREFIX}/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId)) && !(await (async () => {
    const { rows } = await query('select role from users where id = cast($1 as uuid)', [userId]);
    return rows[0]?.role === "teacher";
  })())) {
    return res.status(403).json({ error: "Không có quyền" });
  }

  try {
    const { id } = req.params;
    await query(`delete from exam_questions where id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa câu hỏi thất bại" });
  }
});

app.put(`${API_PREFIX}/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId)) && !(await (async () => {
    const { rows } = await query('select role from users where id = cast($1 as uuid)', [userId]);
    return rows[0]?.role === "teacher";
  })())) {
    return res.status(403).json({ error: "Không có quyền" });
  }

  const { id } = req.params;
  const { content, type, options, subject_id, grade, education_level, category } = req.body || {};
  if (!content) return res.status(400).json({ error: "Nội dung câu hỏi không được để trống" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Identify or create target exam
    const { rows: examRows } = await client.query(
      `select id from exams 
       where user_id = $1 
       and is_repository = true
       and (subject_id = $2 or (subject_id is null and $2 is null))
       and (grade = $3 or (grade is null and $3 is null))
       and (education_level = $4 or (education_level is null and $4 is null))
       limit 1`,
      [userId, subject_id || null, grade || null, education_level || 'Khác']
    );

    let targetExamId;
    if (examRows.length > 0) {
      targetExamId = examRows[0].id;
    } else {
      const title = `Kho câu hỏi - ${education_level || 'Khác'} - ${grade || ''}`;
      const { rows: newExamRows } = await client.query(
        `insert into exams (title, description, user_id, is_public, education_level, subject_id, grade, is_repository)
         values ($1, 'Nơi lưu trữ các câu hỏi trắc nghiệm', $2, false, $3, $4, $5, true)
         returning id`,
        [title, userId, education_level || 'Khác', subject_id || null, grade || null]
      );
      targetExamId = newExamRows[0].id;
    }

    await client.query(
      `update exam_questions set content = $1, type = $2, exam_id = $3, category = $4 where id = $5`,
      [content, type || 'single', targetExamId, category || null, id]
    );

    if (options && Array.isArray(options)) {
      await client.query(`delete from exam_options where question_id = $1`, [id]);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await client.query(
          `insert into exam_options (question_id, content, is_correct, sort_order)
           values ($1, $2, $3, $4)`,
          [id, opt.content, opt.is_correct || false, i]
        );
      }
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Cập nhật câu hỏi thất bại" });
  } finally {
    client.release();
  }
});

app.post(`${API_PREFIX}/questions/bulk`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId)) && !(await (async () => {
    const { rows } = await query('select role from users where id = cast($1 as uuid)', [userId]);
    return rows[0]?.role === "teacher";
  })())) {
    return res.status(403).json({ error: "Không có quyền" });
  }

  const { questions, exam_id, subject_id, grade, education_level } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Mảng câu hỏi là bắt buộc" });
  }

  // Identify or create target exam
  let targetExamId = exam_id;
  if (!targetExamId) {
    const { rows: examRows } = await query(
      `select id from exams 
       where user_id = $1 
       and is_repository = true
       and (subject_id = $2 or (subject_id is null and $2 is null))
       and (grade = $3 or (grade is null and $3 is null))
       and (education_level = $4 or (education_level is null and $4 is null))
       limit 1`,
      [userId, subject_id || null, grade || null, education_level || 'Khác']
    );

    if (examRows.length > 0) {
      targetExamId = examRows[0].id;
    } else {
      const title = `Kho câu hỏi - ${education_level || 'Khác'} - ${grade || ''}`;
      const { rows: newExamRows } = await query(
        `insert into exams (title, description, user_id, is_public, education_level, subject_id, grade, is_repository)
         values ($1, 'Nơi lưu trữ các câu hỏi trắc nghiệm', $2, false, $3, $4, $5, true)
         returning id`,
        [title, userId, education_level || 'Khác', subject_id || null, grade || null]
      );
      targetExamId = newExamRows[0].id;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const isAdmin = await checkAdmin(userId);
    for (const q of questions) {
      const { rows: qRows } = await client.query(
        `insert into exam_questions (exam_id, content, type, category, sort_order, is_repository, is_system)
         values ($1, $2, $3, $4, 0, true, $5) returning id`,
        [targetExamId, q.content, q.type || 'single', q.category || category || null, isAdmin]
      );

      const qId = qRows[0].id;

      if (q.options && Array.isArray(q.options)) {
        for (let i = 0; i < q.options.length; i++) {
          const opt = q.options[i];
          await client.query(
            `insert into exam_options (question_id, content, is_correct, sort_order)
             values ($1, $2, $3, $4)`,
            [qId, opt.content, opt.is_correct || false, i]
          );
        }
      }
    }
    await client.query("COMMIT");
    res.status(201).json({ imported: questions.length });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Nhập hàng loại câu hỏi thất bại" });
  } finally {
    client.release();
  }
});

// ── Dictation Exercises ─────────────────────────────────────────────────────


// GET random dictation by level & language
app.get(`${API_PREFIX}/dictation/random`, async (req, res) => {
  const { level, language } = req.query;
  try {
    let sql = `select * from dictation_exercises`;
    const params = [];
    const conditions = [];
    if (level) { conditions.push(`level = $${params.length + 1}`); params.push(level); }
    if (language) { conditions.push(`language = $${params.length + 1}`); params.push(language); }
    if (conditions.length) sql += ` where ` + conditions.join(" and ");
    sql += ` order by random() limit 1`;
    const { rows } = await query(sql, params);
    if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy bài tập nào" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Lấy danh sách ngẫu nhiên thất bại"
    });
  }
});

// GET all dictation exercises
app.get(`${API_PREFIX}/dictation`, async (req, res) => {
  try {
    const { rows } = await query(
      `select d.*, u.display_name as "authorName"
       from dictation_exercises d
       left join users u on u.id = d.created_by
       order by d.created_at desc`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách thất bại" });
  }
});

// POST create new dictation exercise
app.post(`${API_PREFIX}/dictation`, async (req, res) => {
  const userId = getUserId(req);
  const { title, level, language, content } = req.body;
  if (!title || !level || !content) {
    return res.status(400).json({ error: "Thiếu trường yêu cầu" });
  }
  try {
    const { rows } = await query(
      `insert into dictation_exercises (title, level, language, content, created_by)
       values ($1, $2, $3, $4, $5) returning *`,
      [title, level, language || 'vi', content, userId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo bài tập chính tả thất bại" });
  }
});

// PUT update dictation exercise
app.put(`${API_PREFIX}/dictation/:id`, async (req, res) => {
  const { id } = req.params;
  const { title, level, language, content } = req.body;
  try {
    const { rows, rowCount } = await query(
      `update dictation_exercises set title=$1, level=$2, language=$3, content=$4 where id=$5 returning *`,
      [title, level, language || 'vi', content, id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật bài chính tả thất bại" });
  }
});

// DELETE dictation exercise
app.delete(`${API_PREFIX}/dictation/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    await query(`delete from dictation_exercises where id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Xóa bài tập chính tả thất bại" });
  }
});

// ── Pictogram Questions (Đuổi hình bắt chữ) ───────────────────────────

// GET all pictogram questions
app.get(`${API_PREFIX}/pictogram`, async (req, res) => {
  try {
    const { rows } = await query(
      `select p.*, u.display_name as "authorName"
       from pictogram_questions p
       left join users u on u.id = p.created_by
       order by p.created_at desc`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách thất bại" });
  }
});

// POST create new pictogram question
app.post(`${API_PREFIX}/pictogram`, async (req, res) => {
  const userId = getUserId(req);
  const { image_url, answer, level } = req.body;
  if (!image_url || !answer || !level) {
    return res.status(400).json({ error: "Thiếu trường bắt buộc" });
  }
  try {
    const { rows } = await query(
      `insert into pictogram_questions (image_url, answer, level, created_by)
       values ($1, $2, $3, $4) returning *`,
      [image_url, answer.trim().toUpperCase(), level, userId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo danh sách đuổi hình bắt chữ thất bại" });
  }
});

// PUT update pictogram question
app.put(`${API_PREFIX}/pictogram/:id`, async (req, res) => {
  const { id } = req.params;
  const { image_url, answer, level } = req.body;
  try {
    const { rows, rowCount } = await query(
      `update pictogram_questions set image_url=$1, answer=$2, level=$3 where id=$4 returning *`,
      [image_url, answer.trim().toUpperCase(), level, id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật danh sách đuổi hình bắt chữ thất bại" });
  }
});

// DELETE pictogram question
app.delete(`${API_PREFIX}/pictogram/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    await query(`delete from pictogram_questions where id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Xóa câu hỏi đuổi hình bắt chữ thất bại" });
  }
});

// GET random pictogram questions for playing
app.get(`${API_PREFIX}/pictogram/play`, async (req, res) => {
  const { level, limit = 5 } = req.query;
  try {
    let sql = `select id, image_url, answer, level from pictogram_questions`;
    const params = [];
    if (level) {
      sql += ` where level = $1`;
      params.push(level);
    }
    sql += ` order by random() limit $${params.length + 1}`;
    params.push(Number(limit) || 5);

    const { rows } = await query(sql, params);
    if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy câu hỏi cho level này" });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách câu hỏi thất bại" });
  }
});

// ── Proverbs (Ca dao tục ngữ) Endpoints ─────────────────────────────────────
// GET random proverbs for playing
app.get(`${API_PREFIX}/proverbs/play`, async (req, res) => {
  const { level, limit = 5 } = req.query;
  try {
    let sql = `select id, content, level from proverbs`;
    const params = [];
    if (level) {
      sql += ` where level = $1`;
      params.push(level);
    }
    sql += ` order by random() limit $${params.length + 1}`;
    params.push(Number(limit) || 5);

    const { rows } = await query(sql, params);
    if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy danh sách câu hỏi cho level này" });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách Ca dao tục ngữ thất bại" });
  }
});
app.get(`${API_PREFIX}/proverbs`, async (req, res) => {
  try {
    const { rows } = await query(`select * from proverbs order by created_at desc`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách Ca dao tục ngữ thất bại" });
  }
});

app.post(`${API_PREFIX}/proverbs`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  const { content, level } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: "Thiếu trường bắt buộc" });

  try {
    const { rows } = await query(
      `insert into proverbs (content, level, created_by) values ($1, $2, $3) returning *`,
      [content.trim(), level || 'easy', userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo ca dao tục ngữ thất bại" });
  }
});

app.post(`${API_PREFIX}/proverbs/bulk`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  const { content, level } = req.body || {};
  if (!content) return res.status(400).json({ error: "Thiếu trường bắt buộc" });

  const lines = content.split('\n').map(l => l.trim()).filter(l => l !== "");
  const inserted = [];

  try {
    for (const line of lines) {
      const { rows } = await query(
        `insert into proverbs (content, level, created_by) values ($1, $2, $3) returning *`,
        [line, level || 'easy', userId]
      );
      inserted.push(rows[0]);
    }
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: "Tạo ca dao tục ngữ thất bại" });
  }
});

app.put(`${API_PREFIX}/proverbs/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { content, level } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: "content required" });

  try {
    const { rows } = await query(
      `update proverbs set content = $1, level = $2 where id = $3 returning *`,
      [content.trim(), level || 'easy', id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật ca dao tục ngữ thất bại" });
  }
});

app.delete(`${API_PREFIX}/proverbs/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    const { id } = req.params;
    await query(`delete from proverbs where id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa ca dao tục ngữ thất bại" });
  }
});
// ── Vua Tiếng Việt Endpoints ─────────────────────────────────────
app.get(`${API_PREFIX}/vuatiengviet`, async (req, res) => {
  const { page = 1, limit = 30, level } = req.query;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Number(limit));
  const offset = (p - 1) * l;

  try {
    let whereClause = "";
    const params = [];
    if (level) {
      whereClause = "where level = $1";
      params.push(level);
    }

    // Fetch data
    const querySql = `select * from vua_tieng_viet_questions ${whereClause} order by created_at desc limit $${params.length + 1} offset $${params.length + 2}`;
    const { rows } = await query(querySql, [...params, l, offset]);

    // Fetch total matching
    const countSql = `select count(*)::int from vua_tieng_viet_questions ${whereClause}`;
    const { rows: countRows } = await query(countSql, params);
    const total = countRows[0].count;

    // Fetch stats for all levels
    const { rows: statRows } = await query(
      `select level, count(*)::int as count from vua_tieng_viet_questions group by level`
    );

    // Total of everything (to show in sidebar)
    const { rows: globalCountRows } = await query(`select count(*)::int as count from vua_tieng_viet_questions`);

    const stats = {
      total: globalCountRows[0].count,
      easy: 0,
      medium: 0,
      hard: 0,
      extreme: 0
    };
    statRows.forEach(row => {
      if (stats.hasOwnProperty(row.level)) {
        stats[row.level] = row.count;
      }
    });

    res.json({
      data: rows,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      stats
    });
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách câu hỏi thất bại" });
  }
});

// GET random vua tieng viet questions for playing
app.get(`${API_PREFIX}/vuatiengviet/play`, async (req, res) => {
  const { level, limit = 5 } = req.query;
  try {
    let sql = `select id, question, answer, hint, level from vua_tieng_viet_questions`;
    const params = [];
    if (level) {
      sql += ` where level = $1`;
      params.push(level);
    }
    sql += ` order by random() limit $${params.length + 1}`;
    params.push(Number(limit) || 5);

    const { rows } = await query(sql, params);
    if (rows.length === 0) return res.status(404).json({ error: "No questions found for this level" });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách câu hỏi thất bại" });
  }
});

app.post(`${API_PREFIX}/vuatiengviet`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { question, answer, hint, level } = req.body || {};
  if (!question || !answer) return res.status(400).json({ error: "question and answer required" });

  try {
    const { rows } = await query(
      `insert into vua_tieng_viet_questions (question, answer, hint, level, created_by) values ($1, $2, $3, $4, $5) returning *`,
      [question.trim(), answer.trim(), hint?.trim() || null, level || 'medium', userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo câu hỏi thất bại" });
  }
});

app.post(`${API_PREFIX}/vuatiengviet/bulk`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { questions } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Danh sách câu hỏi là bắt buộc" });
  }

  try {
    // Start transaction
    await query('BEGIN');

    const results = [];
    for (const q of questions) {
      if (!q.question?.trim() || !q.answer?.trim()) continue;

      const { rows } = await query(
        `insert into vua_tieng_viet_questions (question, answer, hint, level, created_by) values ($1, $2, $3, $4, $5) returning id`,
        [q.question.trim(), q.answer.trim(), q.hint?.trim() || null, q.level || 'medium', userId]
      );
      results.push(rows[0]);
    }

    await query('COMMIT');
    res.status(201).json({ imported: results.length });
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    res.status(500).json({ error: "Tạo hàng loạt câu hỏi thất bại" });
  }
});

app.put(`${API_PREFIX}/vuatiengviet/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { question, answer, hint, level } = req.body || {};
  if (!question?.trim() || !answer?.trim()) return res.status(400).json({ error: "question and answer required" });

  try {
    const { rows } = await query(
      `update vua_tieng_viet_questions set question = $1, answer = $2, hint = $3, level = $4 where id = $5 returning *`,
      [question.trim(), answer.trim(), hint?.trim() || null, level || 'medium', id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật câu hỏi thất bại" });
  }
});

app.delete(`${API_PREFIX}/vuatiengviet/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    const { id } = req.params;
    await query(`delete from vua_tieng_viet_questions where id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa câu hỏi thất bại" });
  }
});

// ── Learning with Kids APIs ────────────────────────────────────────────────

app.get(`${API_PREFIX}/learning/categories`, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, COUNT(q.id) as item_count 
       FROM learning_categories c 
       LEFT JOIN learning_questions q ON c.id = q.category_id 
       GROUP BY c.id 
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách danh mục thất bại" });
  }
});

app.get(`${API_PREFIX}/learning/categories/:id`, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM learning_categories WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy danh mục" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách danh mục thất bại" });
  }
});

app.post(`${API_PREFIX}/learning/categories`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  const { name, description, general_question } = req.body || {};
  if (!name || !general_question) return res.status(400).json({ error: "Name and general question required" });

  try {
    const { rows } = await query(
      `INSERT INTO learning_categories (name, description, general_question, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description?.trim() || null, general_question.trim(), userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo danh mục thất bại" });
  }
});

app.put(`${API_PREFIX}/learning/categories/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  const { id } = req.params;
  const { name, description, general_question } = req.body || {};
  if (!name || !general_question) return res.status(400).json({ error: "Name and general question required" });

  try {
    const { rows } = await query(
      `UPDATE learning_categories SET name = $1, description = $2, general_question = $3 WHERE id = $4 RETURNING *`,
      [name.trim(), description?.trim() || null, general_question.trim(), id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy danh mục" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật" });
  }
});

app.delete(`${API_PREFIX}/learning/categories/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`DELETE FROM learning_categories WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa danh mục thất bại" });
  }
});

app.get(`${API_PREFIX}/learning/categories/:categoryId/questions`, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM learning_questions WHERE category_id = $1 ORDER BY created_at ASC`,
      [req.params.categoryId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách câu hỏi thất bại" });
  }
});

app.post(`${API_PREFIX}/learning/questions`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { category_id, image_url, answer } = req.body || {};
  if (!category_id || !image_url || !answer) return res.status(400).json({ error: "Missing required fields" });

  try {
    const { rows } = await query(
      `INSERT INTO learning_questions (category_id, image_url, answer, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [category_id, image_url, answer.trim(), userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo câu hỏi thất bại" });
  }
});

app.put(`${API_PREFIX}/learning/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { image_url, answer } = req.body || {};
  if (!image_url || !answer) return res.status(400).json({ error: "Image URL and answer required" });

  try {
    const { rows } = await query(
      `UPDATE learning_questions SET image_url = $1, answer = $2 WHERE id = $3 RETURNING *`,
      [image_url, answer.trim(), id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy câu hỏi" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật câu hỏi thất bại" });
  }
});

app.delete(`${API_PREFIX}/learning/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`DELETE FROM learning_questions WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa câu hỏi thất bại" });
  }
});

// ── Nhanh Nhu Chop Game APIs ────────────────────────────────────────────────

app.get(`${API_PREFIX}/nhanhnhuchop/questions`, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const { searchTerm, level } = req.query;

    let whereClause = [];
    let params = [];
    let paramIdx = 1;

    if (searchTerm) {
      whereClause.push(`question ILIKE $${paramIdx}`);
      params.push(`%${searchTerm}%`);
      paramIdx++;
    }
    if (level) {
      whereClause.push(`level = $${paramIdx}`);
      params.push(level);
      paramIdx++;
    }

    const whereStr = whereClause.length > 0 ? `WHERE ${whereClause.join(" AND ")}` : "";

    // Fetch questions
    const { rows: questions } = await query(
      `SELECT * FROM nhanh_nhu_chop_questions ${whereStr} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    // Fetch total count for pagination
    const { rows: countRows } = await query(`SELECT count(*) as count FROM nhanh_nhu_chop_questions ${whereStr}`, params);
    const totalCount = parseInt(countRows[0].count);

    res.json({
      questions,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách câu hỏi thất bại" });
  }
});

app.get(`${API_PREFIX}/nhanhnhuchop/play`, async (req, res) => {
  const { level, limit } = req.query;
  const count = parseInt(limit) || 10;
  try {
    const { rows } = await query(
      `SELECT * FROM nhanh_nhu_chop_questions WHERE level = $1 ORDER BY RANDOM() LIMIT $2`,
      [level || 'medium', count]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Lấy danh sách câu hỏi thất bại" });
  }
});

app.post(`${API_PREFIX}/contact`, async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin bắt buộc." });
  }

  const adminEmail = process.env.EMAIL_USER;
  if (!adminEmail) {
    return res.status(500).json({ error: "Hệ thống chưa cấu hình email nhận." });
  }

  const subject = `[Smart Learn] Thông tin liên hệ mới từ ${name}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2D9B63; border-bottom: 2px solid #2D9B63; padding-bottom: 10px;">Tin nhắn liên hệ mới</h2>
      <p><b>Họ tên:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Số điện thoại:</b> ${phone}</p>
      <p><b>Nội dung:</b></p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${message || "Không có nội dung."}</div>
    </div>
  `;

  try {
    const success = await sendMail(adminEmail, subject, html);
    if (success) {
      res.json({ success: true, message: "Đã gửi thành công!" });
    } else {
      res.status(500).json({ error: "Lỗi gửi mail." });
    }
  } catch (err) {
    res.status(500).json({ error: "Lỗi server." });
  }
});

app.post(`${API_PREFIX}/nhanhnhuchop/questions`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { question, options, correct_index, explanation, level } = req.body || {};
  if (!question || !Array.isArray(options)) return res.status(400).json({ error: "Question and options required" });

  try {
    const { rows } = await query(
      `INSERT INTO nhanh_nhu_chop_questions (question, options, correct_index, explanation, level, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [question.trim(), options, correct_index || 0, explanation?.trim() || null, level || 'medium', userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Tạo câu hỏi thất bại" });
  }
});

app.post(`${API_PREFIX}/nhanhnhuchop/import`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  const { questions } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Thiếu danh sách câu hỏi" });
  }

  try {
    await query('BEGIN');
    const results = [];
    for (const q of questions) {
      if (!q.question?.trim() || !Array.isArray(q.options)) continue;

      const { rows } = await query(
        `INSERT INTO nhanh_nhu_chop_questions (question, options, correct_index, explanation, level, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [q.question.trim(), q.options, q.correct_index || 0, q.explanation?.trim() || null, q.level || 'medium', userId]
      );
      results.push(rows[0]);
    }
    await query('COMMIT');
    res.status(201).json({ imported: results.length });
  } catch (err) {
    await query('ROLLBACK').catch(() => { });
    res.status(500).json({ error: "Thêm câu hỏi thất bại" });
  }
});

app.put(`${API_PREFIX}/nhanhnhuchop/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  const { id } = req.params;
  const { question, options, correct_index, explanation, level } = req.body || {};
  if (!question || !Array.isArray(options)) return res.status(400).json({ error: "Thiếu trường bắt buộc" });

  try {
    const { rows } = await query(
      `UPDATE nhanh_nhu_chop_questions SET question = $1, options = $2, correct_index = $3, explanation = $4, level = $5 
       WHERE id = $6 RETURNING *`,
      [question.trim(), options, correct_index || 0, explanation?.trim() || null, level || 'medium', id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy câu hỏi" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Cập nhật câu hỏi thất bại" });
  }
});

app.delete(`${API_PREFIX}/nhanhnhuchop/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Không có quyền" });

  try {
    await query(`DELETE FROM nhanh_nhu_chop_questions WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Xóa câu hỏi thất bại" });
  }
});

// Catch-all handler to serve index.html for SPA (placed at the end)

app.use((req, res, next) => {
  // If it's an API request that reached here, it's a 404
  if (req.path.startsWith(API_PREFIX)) return res.status(404).json({ error: "Không tìm thấy" });

  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) {
      // If index.html is missing (e.g. no build), continue to default 404
      next();
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ── Server Initialization & DB Setup ───────────────────────────────────────
async function initializeApp() {
  try {
    const schemaSql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
    const statements = schemaSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        const isAlreadyExists = err.code === "42P07" || err.code === "42710" || err.message.includes("already exists");
        const isMissingUserId = err.code === "42703" && err.message.includes("user_id");

        if (isAlreadyExists || isMissingUserId) {
        } else {
        }
      }
    }

    // ── Seed & Migration ──────────────────────────────────────────────────
    try {
      const adminUsername = "adminsmart";
      const adminEmail = "ntvant611@gmail.com";
      const adminPass = "Smartlearn@1987";
      const adminHash = await hashPassword(adminPass);

      // 1. Seed Admin
      let { rows: admins } = await query(
        `select id from users where username = $1`,
        [adminUsername]
      );

      let adminId;
      if (admins.length === 0) {
        const { rows } = await query(
          `insert into users (username, email, password_hash, display_name, role)
           values ($1, $2, $3, $4, $5)
           returning id`,
          [adminUsername, adminEmail, adminHash, "Quản trị viên", "admin"]
        );
        adminId = rows[0].id;
      } else {
        adminId = admins[0].id;
      }

      // 2. Add columns if missing
      const tables = ["subjects", "curricula", "quizlet_sets", "exams"];
      for (const t of tables) {
        try {
          await query(`alter table ${t} add column if not exists user_id uuid references users(id)`);
          await query(`create index if not exists idx_${t}_user_id on ${t}(user_id)`);
        } catch (colErr) {
        }
      }

      // Add sort_order to subjects if missing
      try {
        await query(`alter table subjects add column if not exists sort_order integer not null default 0`);
      } catch (colErr) {
      }

      // Add is_active and education_level to users if missing
      try {
        await query(`alter table users add column if not exists is_active boolean not null default true`);
      } catch (colErr) {
      }
      try {
        await query(`alter table users add column if not exists education_level text`);
      } catch (colErr) {
      }

      // Add language column to dictation_exercises if missing
      try {
        await query(`alter table dictation_exercises add column if not exists language text not null default 'vi'`);
      } catch (colErr) {
      }

      // ── Pictogram Table Migration ──────────────────────────────────────────
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS pictogram_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            image_url TEXT NOT NULL,
            answer TEXT NOT NULL,
            level TEXT NOT NULL DEFAULT 'medium',
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_pictogram_created_by ON pictogram_questions(created_by)`);
      } catch (tabErr) {
      }

      // Add subject_id to tables if missing
      const subjectTables = ["curricula", "quizlet_sets", "exams"];
      for (const t of subjectTables) {
        try {
          await query(`alter table ${t} add column if not exists subject_id uuid references subjects(id) on delete set null`);
          await query(`create index if not exists idx_${t}_subject_id on ${t}(subject_id)`);
        } catch (colErr) {
        }
      }

      // Specific columns for quizlet_sets
      try {
        await query(`alter table quizlet_sets add column if not exists grade text`);
        await query(`alter table quizlet_sets add column if not exists education_level text`);
      } catch (colErr) {
      }

      // Specific columns for exams
      try {
        await query(`alter table exams add column if not exists grade text`);
        await query(`alter table exams add column if not exists education_level text`);
        await query(`alter table exams add column if not exists is_public boolean default true`);
        await query(`alter table exams add column if not exists is_repository boolean default false`);
      } catch (colErr) {
      }

      // Specific columns for curricula
      try {
        await query(`alter table curricula add column if not exists education_level text`);
        await query(`alter table curricula add column if not exists is_public boolean default false`);
      } catch (colErr) {
      }

      // 3. Migration: Assign orphan records to admin
      await query(`update subjects set user_id = $1 where user_id is null`, [adminId]);
      await query(`update curricula set user_id = $1 where user_id is null`, [adminId]);
      await query(`update quizlet_sets set user_id = $1 where user_id is null`, [adminId]);
      await query(`update exams set user_id = $1 where user_id is null`, [adminId]);

      try {
        await query(`alter table proverbs alter column level type text using (case when level::text='1' then 'easy' when level::text='2' then 'medium' when level::text='3' then 'hard' when level::text='4' then 'extreme' else 'easy' end)`);
        await query(`alter table proverbs alter column level set default 'easy'`);
      } catch (colErr) {
      }

      // ── Learning with Kids Tables ──────────────────────────────────────────
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS learning_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            general_question TEXT NOT NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS learning_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category_id UUID REFERENCES learning_categories(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
      } catch (tabErr) {
        console.warn(`[Migration] Could not create learning tables:`, tabErr.message);
      }

      // ── Nhanh Nhu Chop Table Migration ─────────────────────────────────────
      console.log("[Migration] Checking nhanh_nhu_chop_questions table...");
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS nhanh_nhu_chop_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            question TEXT NOT NULL,
            options TEXT[] NOT NULL DEFAULT '{}',
            correct_index INTEGER NOT NULL DEFAULT 0,
            explanation TEXT,
            level TEXT NOT NULL DEFAULT 'medium',
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_nc_level ON nhanh_nhu_chop_questions(level)`);
      } catch (tabErr) {
        console.warn(`[Migration] Could not create nhanh_nhu_chop tables:`, tabErr.message);
      }

      // ── User Subjects Table Migration ──────────────────────────────────────
      console.log("[Migration] Checking user_subjects table...");
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS user_subjects (
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, subject_id)
          )
        `);
      } catch (tabErr) {
        console.warn(`[Migration] Could not create user_subjects table:`, tabErr.message);
      }

    } catch (migErr) {
      console.error("[Migration Error] Failed:", migErr);
    }

  } catch (err) {
    console.error("[Server] DB Initialization failed:", err);
    // On Railway, if we throw here, the process exits and Railway shows a deploy failure.
    // This is better than starting a broken server.
    throw err;
  }
}

// ── Global Express Error Handler ───────────────────────────────────────────
app.use(async (err, req, res, next) => {
  console.error("[Unhandled Express Error]", err.stack || err.message);
  try { await fs.appendFile(path.join(projectRoot, "server_error.log"), `[${new Date().toISOString()}] Unhandled Express Error: ${err.message}\n${err.stack}\n`); } catch (e) { }
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại.", details: err.message });
});

// Start the server only after the app is initialized
try {
  await initializeApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] API running on http://0.0.0.0:${PORT}${API_PREFIX}`);
    console.log(`[Server] Local access: http://localhost:${PORT}${API_PREFIX}`);
  });
} catch (err) {
  console.error("[Server] Fatal error during startup:", err);
  process.exit(1);
}


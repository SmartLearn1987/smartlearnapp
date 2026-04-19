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
const upload = multer({ storage });

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
      
      return res.status(403).json({ error: "Forbidden: Invalid API Key" });
    }
  }
  next();
});

app.post(`${API_PREFIX}/upload`, upload.single("file"), (req, res) => {
  console.log(`[Upload] Received upload request: ${req.file?.originalname || 'No file'}`);
  if (!req.file) {
    console.error("[Upload Error] No file in request");
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  // Trả về đường dẫn truy cập cho ảnh
  const fileUrl = `/uploads/${req.file.filename}`;
  console.log(`[Upload] File saved successfully: ${fileUrl}`);
  res.json({ url: fileUrl });
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
      );`
    ];
    for (const q of queries) {
      await query(q);
    }
    console.log("Auto-migration completed: ensured all recent user columns are present.");
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
    const { rows } = await query('select session_token, access_token_expires_at from users where id = $1', [userId]);
    const user = rows[0];
    if (!user || (user.session_token && user.session_token !== sessionToken)) {
      return res.status(401).json({ error: "Phiên đăng nhập đã hết hạn hoặc bạn đã đăng nhập ở thiết bị/trình duyệt khác." });
    }

    if (user.access_token_expires_at && new Date() > new Date(user.access_token_expires_at)) {
      return res.status(401).json({ error: "TOKEN_EXPIRED" });
    }
  } catch (err) {
    console.error("Session verification error:", err);
    return res.status(500).json({ error: "Lỗi xác thực phiên làm việc." });
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
    `update users set session_token = $1, refresh_token = $2, access_token_expires_at = $3, refresh_token_expires_at = $4 where id = $5`,
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
        <p style="margin: 0;"><b>Zalo:</b> 0984.999.360 - 0987.384.380</p>
        <p style="margin: 0;"><b>Email:</b> support.smart.learn@gmail.com</p>
      </div>
    </div>
  `;
  return sendMail(email, subject, html);
}

// ── Auth Endpoints ────────────────────────────────────────────────────────
app.post(`${API_PREFIX}/register`, async (req, res) => {
  const { username, email, password, display_name, education_level } = req.body || {};
  if (!username?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `insert into users (username, email, password_hash, display_name, education_level, plan, plan_start_date, plan_end_date)
       values ($1, $2, $3, $4, $5, $6, NOW(), NOW() + interval '6 days')
       returning id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"`,
      [username.trim(), email.trim(), passwordHash, display_name?.trim() || username.trim(), education_level || "Tiểu học", "Miễn phí"]
    );

    const newUser = rows[0];
    const { accessToken, refreshToken, accessTokenExpiresAt } = await generateTokens(newUser.id);
    
    // Gửi email xác nhận đăng ký thành công
    if (newUser && newUser.email) {
      sendRegistrationEmail(newUser.email, newUser.displayName).catch(err => {
        console.error("Failed to send registration email:", err);
      });
    }

    res.status(201).json({ ...newUser, sessionToken: accessToken, refreshToken, accessTokenExpiresAt });
  } catch (err) {
    if (err.message.includes("unique constraint")) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    console.error("Register Error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post(`${API_PREFIX}/login`, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `select id, username, email, display_name as "displayName", role, password_hash, created_at as "createdAt", is_active as "isActive", education_level as "educationLevel", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate"
       from users where lower(username) = lower($1)`,
      [username.trim()]
    );


    const user = rows[0];
    if (!user || user.password_hash !== passwordHash) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa." });
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } = await generateTokens(user.id);

    const { password_hash: _, ...safeUser } = user;
    res.json({ ...safeUser, sessionToken: accessToken, refreshToken, accessTokenExpiresAt });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post(`${API_PREFIX}/refresh-token`, async (req, res) => {
  const { userId, refreshToken } = req.body || {};
  if (!userId || !refreshToken) return res.status(400).json({ error: "Missing data" });

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
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (new Date() > new Date(user.refresh_token_expires_at)) {
      return res.status(401).json({ error: "Refresh token expired" });
    }

    const { accessToken, refreshToken: newRefresh, accessTokenExpiresAt } = await generateTokens(userId);
    res.json({ sessionToken: accessToken, refreshToken: newRefresh, accessTokenExpiresAt });
  } catch (err) {
    console.error("Refresh Token Error:", err);
    res.status(500).json({ error: "Refresh failed" });
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
            <p style="margin: 0;"><b>Zalo:</b> 0984.999.360 - 0987.384.380</p>
            <p style="margin: 0;"><b>Email:</b> support.smart.learn@gmail.com</p>
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
    const { rows } = await query(`select role from users where id = $1`, [userId]);
    return rows[0]?.role === "admin";
  } catch (err) {
    return false;
  }
}

// ── Current User Profile ──────────────────────────────────────────────────
app.get(`${API_PREFIX}/me`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { rows } = await query(
      `select id, username, email, display_name as "displayName", role, education_level as "educationLevel", avatar_url as "avatarUrl", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"
       from users where id = $1`,
      [userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /me Error:", err.message);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// ── User Management (Admin) ────────────────────────────────────────────────
app.get(`${API_PREFIX}/users`, async (req, res) => {
  // In a real app, check if the requester is an admin here
  try {
    const { rows } = await query(
      `select id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", created_at as "createdAt"
       from users order by created_at desc`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post(`${API_PREFIX}/users`, async (req, res) => {
  let { username, email, password, display_name, role = "user", education_level, plan = "Miễn phí", plan_start_date, plan_end_date } = req.body || {};
  if (!username?.trim() || !password) return res.status(400).json({ error: "Missing fields" });

  // Thiết lập mặc định nếu chưa có ngày bắt đầu/kết thúc
  if (!plan_start_date) {
    plan_start_date = new Date().toISOString();
  }
  if (!plan_end_date) {
    const defaultEnd = new Date(plan_start_date);
    defaultEnd.setDate(defaultEnd.getDate() + 6);
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
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete(`${API_PREFIX}/users/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await query(`select username from users where id = $1`, [id]);
    if (rows[0]?.username === "adminsmart") {
      return res.status(403).json({ error: "Cannot delete the root admin account" });
    }
    await query(`delete from users where id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.put(`${API_PREFIX}/users/:id`, async (req, res) => {
  const { id } = req.params;
  const { email, display_name, role, education_level, avatar_url, is_active, plan = "Miễn phí", plan_start_date = null, plan_end_date = null } = req.body || {};
  try {
    const { rows } = await query(
      `update users
       set email = $1, display_name = $2, role = $3, education_level = $4, is_active = $5, plan = $6, plan_start_date = $7, plan_end_date = $8, avatar_url = $9
       where id = $10
       returning id, username, email, display_name as "displayName", role, education_level as "educationLevel", is_active as "isActive", plan, plan_start_date::text as "planStartDate", plan_end_date::text as "planEndDate", avatar_url as "avatarUrl", created_at as "createdAt"`,
      [email?.trim() || "", display_name?.trim() || "", role || "user", education_level || null, is_active ?? true, plan, plan_start_date, plan_end_date, avatar_url || null, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /users/:id Error:", err.message);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.put(`${API_PREFIX}/users/:id/password`, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "Password required" });
  try {
    const hash = await hashPassword(password);
    await query(`update users set password_hash = $1 where id = $2`, [hash, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" });
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
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

app.get(`${API_PREFIX}/system-pages`, async (req, res) => {
  try {
    const { rows } = await query(`select slug, title, updated_at from system_pages order by title asc`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pages" });
  }
});

app.post(`${API_PREFIX}/system-pages`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Unauthorized" });

  const { slug, title, content } = req.body || {};
  if (!slug || !title) return res.status(400).json({ error: "Slug and title are required" });

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
    res.status(500).json({ error: "Failed to update page" });
  }
});

app.get(`${API_PREFIX}/user-subjects`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { rows } = await query(
      `select s.*, count(c.id)::int as curriculum_count
       from subjects s
       join user_subjects us on s.id = us.subject_id
       left join curricula c on c.subject_id = s.id and c.is_public = true
       where us.user_id = $1
       group by s.id
       order by s.sort_order asc, s.created_at desc`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /user-subjects Error:", err.message);
    res.status(500).json({ error: "Failed to fetch user subjects", details: err.message });
  }
});

app.post(`${API_PREFIX}/user-subjects`, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { subject_ids } = req.body || {};
  if (!Array.isArray(subject_ids)) return res.status(400).json({ error: "subject_ids must be an array" });

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
    res.status(500).json({ error: "Failed to update user subjects" });
  }
});


app.get(`${API_PREFIX}/subjects`, async (req, res) => {
  try {
    const { rows } = await query(
      `select s.*, count(c.id)::int as curriculum_count
       from subjects s
       left join curricula c on c.subject_id = s.id and c.is_public = true
       group by s.id
       order by s.sort_order asc, s.created_at desc`
    );
    res.json(rows);

  } catch (err) {
    console.error("GET /subjects Error:", err.message);
    res.status(500).json({ error: "Failed to fetch subjects", details: err.message });
  }
});

app.get(`${API_PREFIX}/subjects/:id`, async (req, res) => {
  try {
    const { rows } = await query(
      `select s.*, count(c.id)::int as curriculum_count
       from subjects s
       left join curricula c on c.subject_id = s.id and c.is_public = true
       where s.id = $1
       group by s.id`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Subject not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subject" });
  }
});

app.post(`${API_PREFIX}/subjects`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Only admins can create subjects" });

  const { name, description = null, icon = null, created_by = null } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  try {
    const { rows } = await query(
      `insert into subjects (name, description, icon, user_id, created_by, sort_order)
       values ($1, $2, $3, $4, $5, (select coalesce(max(sort_order), -1) + 1 from subjects))
       returning *`,
      [name.trim(), description, icon, userId, created_by]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create subject" });
  }
});

app.put(`${API_PREFIX}/subjects/reorder`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { orders } = req.body || {}; // array of { id, sort_order }
  if (!Array.isArray(orders)) return res.status(400).json({ error: "orders must be an array" });

  try {
    for (const item of orders) {
      await query(`update subjects set sort_order = $1 where id = $2`, [item.sort_order, item.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reorder subjects" });
  }
});

app.put(`${API_PREFIX}/subjects/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { name, description = null, icon = null } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });
  try {
    const { rows } = await query(
      `update subjects
       set name = $1, description = $2, icon = $3
       where id = $4
       returning *`,
      [name.trim(), description, icon, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Subject not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update subject" });
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
    res.status(500).json({ error: "Failed to delete subject" });
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
    res.status(500).json({ error: "Failed to fetch curricula" });
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

    if (!rows[0]) return res.status(404).json({ error: "Curriculum not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch curriculum" });
  }
});

 app.post(`${API_PREFIX}/curricula`, upload.single("file"), async (req, res) => {
   const userId = getUserId(req);
   if (!userId) return res.status(401).json({ error: "Unauthorized" });

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
  } catch (err) {
    res.status(500).json({ error: "Failed to create curriculum" });
  }
});

 app.put(`${API_PREFIX}/curricula/:id`, async (req, res) => {
   const userId = getUserId(req);
   if (!userId) return res.status(401).json({ error: "Unauthorized" });
 
   const { id } = req.params;
   const isAdmin = await checkAdmin(userId);
   const { rows: ownerRows } = await query(`select user_id from curricula where id = $1`, [id]);
   if (!ownerRows[0]) return res.status(404).json({ error: "Curriculum not found" });
   
   const isOwner = ownerRows[0].user_id === userId;
   if (!isAdmin && !isOwner) return res.status(403).json({ error: "Forbidden" });

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
  if (!name?.trim()) return res.status(400).json({ error: "name is required" });

  try {
    const { rows } = await query(
      `update curricula
       set name = $1, grade = $2, education_level = $3, is_public = $4, publisher = $5, lesson_count = $6, file_url = $7, file_content = $8, image_url = $9
       where id = $10
       returning *`,
      [name.trim(), grade, education_level, is_public, publisher, Number(lesson_count) || 0, file_url, file_content, image_url, id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Curriculum not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update curriculum" });
  }
});

 app.post(`${API_PREFIX}/curricula/reorder`, async (req, res) => {
   const userId = getUserId(req);
   if (!userId) return res.status(401).json({ error: "Unauthorized" });
   
   // For reorder, ideally we check if user owns all curricula they are reordering
   // For now, allow any logged in user as they only see their own anyway in the UI
   // But ideally we'd verify each ID in the loop. For local/low-risk, this is OK.

  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: "Invalid order format" });

    // Update each curriculum's sort_order based on the provided array
    for (let i = 0; i < order.length; i++) {
      await query(`update curricula set sort_order = $1 where id = $2`, [i, order[i]]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error reordering curricula:", err);
    res.status(500).json({ error: "Failed to reorder curricula" });
  }
});

 app.delete(`${API_PREFIX}/curricula/:id`, async (req, res) => {
   const userId = getUserId(req);
   if (!userId) return res.status(401).json({ error: "Unauthorized" });
 
   const { id } = req.params;
   const isAdmin = await checkAdmin(userId);
   const { rows: ownerRows } = await query(`select user_id from curricula where id = $1`, [id]);
   if (!ownerRows[0]) return res.status(204).send(); // Gone already
   
   const isOwner = ownerRows[0].user_id === userId;
   if (!isAdmin && !isOwner) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`delete from curricula where id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete curriculum" });
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
    res.status(500).json({ error: "Failed to fetch lessons" });
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
    if (!rows[0]) return res.status(404).json({ error: "Lesson not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lesson" });
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
  if (!curriculum_id) return res.status(400).json({ error: "curriculum_id is required" });
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });

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
    res.status(500).json({ error: "Failed to create lesson" });
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
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });
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
    if (!rows[0]) return res.status(404).json({ error: "Lesson not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

app.delete(`${API_PREFIX}/lessons/:id`, async (req, res) => {
  try {
    await query(`delete from lessons where id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete lesson" });
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
    res.status(500).json({ error: "Failed to save quiz/flashcards" });
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
    res.status(500).json({ error: "Failed to fetch lesson images" });
  }
});

app.post(`${API_PREFIX}/lessons/:id/images`, upload.array("images", 20), async (req, res) => {
  const { id } = req.params;
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

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
  } catch (err) {
    res.status(500).json({ error: "Failed to upload lesson images" });
  }
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
      await fs.unlink(filePath).catch(() => {});
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete lesson image" });
  }
});

app.get(`${API_PREFIX}/progress`, async (req, res) => {
  const studentId = String(req.query.student_id || "").trim();
  if (!studentId) return res.status(400).json({ error: "student_id is required" });
  try {
    const { rows } = await query(
      `select lesson_id::text as lesson_id, completed, completed_at
       from lesson_progress
       where student_id = $1`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

app.put(`${API_PREFIX}/progress/:lessonId`, async (req, res) => {
  const { lessonId } = req.params;
  const studentId = String(req.body?.student_id || "").trim();
  const completed = Boolean(req.body?.completed);
  if (!studentId) return res.status(400).json({ error: "student_id is required" });
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
    res.status(500).json({ error: "Failed to save progress" });
  }
});

app.get(`${API_PREFIX}/quizlets`, async (req, res) => {
  const userId = getUserId(req);
  const admin = await checkAdmin(userId);
  try {
    const { rows } = await query(
      `select q.*, 
        s.name as subject_name,
        (select count(*)::int from quizlet_terms t where t.quizlet_set_id = q.id) as term_count,
        coalesce(u.display_name, q.created_by, 'Người dùng ẩn danh') as author_name
       from quizlet_sets q
       left join users u on q.user_id = u.id
       left join subjects s on q.subject_id = s.id
       where ($2 = true or q.user_id = $1 or q.is_public = true)
       order by s.name asc, q.created_at desc`,
      [userId, admin]
    );
    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quizlet sets" });
  }
});

app.post(`${API_PREFIX}/quizlets`, async (req, res) => {
  const { title, description = null, subject_id = null, grade = null, education_level = null, is_public = false, created_by = null, terms = [] } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });

  const client = await pool.connect();
  try {
    await client.query("begin");
    
    const userId = getUserId(req);
    // Insert quizlet set
    const { rows: setRows } = await client.query(
      `insert into quizlet_sets (title, description, subject_id, grade, education_level, is_public, user_id, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [title.trim(), description, subject_id, grade, education_level, is_public, userId, created_by]
    );

    const setId = setRows[0].id;

    // Insert terms
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      if (!t.term?.trim() && !t.definition?.trim()) continue;
      await client.query(
        `insert into quizlet_terms (quizlet_set_id, term, definition, image_url, sort_order)
         values ($1, $2, $3, $4, $5)`,
        [setId, t.term?.trim() || "", t.definition?.trim() || "", t.image_url || null, i]
      );
    }

    await client.query("commit");
    res.status(201).json({ id: setId });
  } catch (err) {
    await client.query("rollback");
    res.status(500).json({ error: "Failed to create quizlet set" });
  } finally {
    client.release();
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

    if (!setRows[0]) return res.status(404).json({ error: "Quizlet set not found or permission denied" });

    const { rows: termRows } = await query(
      `select * from quizlet_terms where quizlet_set_id = $1 order by sort_order asc`,
      [req.params.id]
    );

    res.json({ ...setRows[0], terms: termRows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quizlet set" });
  }
});

app.put(`${API_PREFIX}/quizlets/:id`, async (req, res) => {
  const { id } = req.params;
  const { title, description = null, subject_id = null, grade = null, education_level = null, is_public = true, terms = [] } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });

  const client = await pool.connect();
  try {
    await client.query("begin");
    
    const userId = getUserId(req);
    const isAdmin = await checkAdmin(userId);
    // Update quizlet set
    const { rows: setRows } = await client.query(
      `update quizlet_sets 
       set title = $1, description = $2, subject_id = $3, grade = $4, education_level = $5, is_public = $6
       where id = $7 and ($8 = true or user_id = $9)
       returning id`,
      [title.trim(), description, subject_id, grade, education_level, is_public, id, isAdmin, userId]
    );

    if (!setRows[0]) {
      await client.query("rollback");
      return res.status(404).json({ error: "Quizlet set not found or permission denied" });
    }

    // Replace terms (delete old, insert new)
    await client.query(`delete from quizlet_terms where quizlet_set_id = $1`, [id]);

    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      if (!t.term?.trim() && !t.definition?.trim()) continue;
      await client.query(
        `insert into quizlet_terms (quizlet_set_id, term, definition, image_url, sort_order)
         values ($1, $2, $3, $4, $5)`,
        [id, t.term?.trim() || "", t.definition?.trim() || "", t.image_url || null, i]
      );
    }

    await client.query("commit");
    res.json(setRows[0]);
  } catch (err) {
    await client.query("rollback");
    res.status(500).json({ error: "Failed to update quizlet set" });
  } finally {
    client.release();
  }
});

app.delete(`${API_PREFIX}/quizlets/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const userId = getUserId(req);
    const isAdmin = await checkAdmin(userId);
    
    // Check if the set exists and is owned by the user or if the user is an admin
    const { rows } = await query(`select id from quizlet_sets where id = $1 and ($2 = true or user_id = $3)`, [id, isAdmin, userId]);
    if (rows.length === 0) return res.status(404).json({ error: "Quizlet set not found" });

    // Delete terms first (if not cascading)
    await query(`delete from quizlet_terms where quizlet_set_id = $1`, [id]);
    await query(`delete from quizlet_sets where id = $1`, [id]);
    res.status(204).send();

  } catch (err) {
    res.status(500).json({ error: "Failed to delete quizlet set" });
  }
});

// ── Exams (Trắc nghiệm) ──────────────────────────────────────────────────
app.get(`${API_PREFIX}/exams`, async (req, res) => {
  const userId = getUserId(req);
  const admin = await checkAdmin(userId);
  try {
    const { rows } = await query(
      `select e.*, 
       s.name as subject_name,
       (select count(*) from exam_questions where exam_id = e.id) as question_count,
       (select round(avg(score)) from exam_results where exam_id = e.id and user_id = $1) as average_score,
       u.display_name as author_name
       from exams e 
       left join users u on e.user_id = u.id
       left join subjects s on e.subject_id = s.id
       where ($2 = true or e.user_id = $1 or e.is_public = true)
       order by e.created_at desc`,
      [userId, admin]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exams" });
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
    if (exams.length === 0) return res.status(404).json({ error: "Exam not found or permission denied" });

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
    console.error("Exam Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch exam details" });
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
    if (rowCount === 0) return res.status(404).json({ error: "Exam not found or permission denied" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete exam" });
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
    console.error("Exam Post Error:", err);
    res.status(500).json({ error: "Failed to create exam" });
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
      throw new Error("Exam not found or permission denied");
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
    console.error("Exam Put Error:", err);
    res.status(500).json({ error: err.message || "Failed to update exam" });
  } finally {
    client.release();
  }
});


app.post(`${API_PREFIX}/exams/:id/results`, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { score, timeTaken } = req.body || {};
  
  if (score === undefined || timeTaken === undefined) {
    console.warn("[Result Error] Missing score or timeTaken in request body");
    return res.status(400).json({ error: "Missing score or timeTaken" });
  }

  try {
    const { rows } = await query(
      `insert into exam_results (exam_id, user_id, score, time_taken)
       values ($1, $2, $3, $4) returning id`,
      [id, userId, score, timeTaken]
    );
    console.log(`[Result] Saved result for user ${userId} on exam ${id}. Score: ${score}%`);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Result Post Error:", err.message, "Details:", { id, userId, score, timeTaken });
    res.status(500).json({ error: "Failed to save exam result", details: err.message });
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
    if (rows.length === 0) return res.status(404).json({ error: "No exercise found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Dictation Random Error:", err);
    res.status(500).json({ error: "Failed to fetch random dictation" });
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
    console.error("Dictation GET Error:", err);
    res.status(500).json({ error: "Failed to fetch dictation exercises" });
  }
});

// POST create new dictation exercise
app.post(`${API_PREFIX}/dictation`, async (req, res) => {
  const userId = getUserId(req);
  const { title, level, language, content } = req.body;
  if (!title || !level || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const { rows } = await query(
      `insert into dictation_exercises (title, level, language, content, created_by)
       values ($1, $2, $3, $4, $5) returning *`,
      [title, level, language || 'vi', content, userId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Dictation POST Error:", err);
    res.status(500).json({ error: "Failed to create dictation exercise" });
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
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Dictation PUT Error:", err);
    res.status(500).json({ error: "Failed to update dictation exercise" });
  }
});

// DELETE dictation exercise
app.delete(`${API_PREFIX}/dictation/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    await query(`delete from dictation_exercises where id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Dictation DELETE Error:", err);
    res.status(500).json({ error: "Failed to delete dictation exercise" });
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
    console.error("Pictogram GET Error:", err);
    res.status(500).json({ error: "Failed to fetch pictogram questions" });
  }
});

// POST create new pictogram question
app.post(`${API_PREFIX}/pictogram`, async (req, res) => {
  const userId = getUserId(req);
  const { image_url, answer, level } = req.body;
  if (!image_url || !answer || !level) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const { rows } = await query(
      `insert into pictogram_questions (image_url, answer, level, created_by)
       values ($1, $2, $3, $4) returning *`,
      [image_url, answer.trim().toUpperCase(), level, userId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Pictogram POST Error:", err);
    res.status(500).json({ error: "Failed to create pictogram question" });
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
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Pictogram PUT Error:", err);
    res.status(500).json({ error: "Failed to update pictogram question" });
  }
});

// DELETE pictogram question
app.delete(`${API_PREFIX}/pictogram/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    await query(`delete from pictogram_questions where id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Pictogram DELETE Error:", err);
    res.status(500).json({ error: "Failed to delete pictogram question" });
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
    if (rows.length === 0) return res.status(404).json({ error: "No questions found for this level" });
    res.json(rows);
  } catch (err) {
    console.error("Pictogram Play API Error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
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
    if (rows.length === 0) return res.status(404).json({ error: "No proverbs found for this level" });
    res.json(rows);
  } catch (err) {
    console.error("Proverbs Play API Error:", err);
    res.status(500).json({ error: "Failed to fetch proverbs" });
  }
});
app.get(`${API_PREFIX}/proverbs`, async (req, res) => {
  try {
    const { rows } = await query(`select * from proverbs order by created_at desc`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch proverbs" });
  }
});

app.post(`${API_PREFIX}/proverbs`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { content, level } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: "content required" });

  try {
    const { rows } = await query(
      `insert into proverbs (content, level, created_by) values ($1, $2, $3) returning *`,
      [content.trim(), level || 'easy', userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create proverb" });
  }
});

app.post(`${API_PREFIX}/proverbs/bulk`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { content, level } = req.body || {};
  if (!content) return res.status(400).json({ error: "content required" });

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
    console.error("Bulk proverbs error:", err);
    res.status(500).json({ error: "Failed to create some proverbs" });
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
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update proverb" });
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
    res.status(500).json({ error: "Failed to delete proverb" });
  }
});
// ── Vua Tiếng Việt Endpoints ─────────────────────────────────────
app.get(`${API_PREFIX}/vuatiengviet`, async (req, res) => {
  try {
    const { rows } = await query(`select * from vua_tieng_viet_questions order by created_at desc`);
    res.json(rows);
  } catch (err) {
    console.error("Vua Tieng Viet List API Error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
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
    console.error("Vua Tieng Viet Play API Error:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
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
    console.error("Vua Tieng Viet Create API Error:", err);
    res.status(500).json({ error: "Failed to create question" });
  }
});

app.post(`${API_PREFIX}/vuatiengviet/bulk`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { questions } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "questions array is required" });
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
    await query('ROLLBACK').catch(() => {});
    console.error("Vua Tieng Viet Bulk Create API Error:", err);
    res.status(500).json({ error: "Failed to bulk create questions" });
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
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update question" });
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
    res.status(500).json({ error: "Failed to delete question" });
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
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get(`${API_PREFIX}/learning/categories/:id`, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM learning_categories WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

app.post(`${API_PREFIX}/learning/categories`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { name, description, general_question } = req.body || {};
  if (!name || !general_question) return res.status(400).json({ error: "Name and general question required" });

  try {
    const { rows } = await query(
      `INSERT INTO learning_categories (name, description, general_question, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description?.trim() || null, general_question.trim(), userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put(`${API_PREFIX}/learning/categories/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { name, description, general_question } = req.body || {};
  if (!name || !general_question) return res.status(400).json({ error: "Name and general question required" });

  try {
    const { rows } = await query(
      `UPDATE learning_categories SET name = $1, description = $2, general_question = $3 WHERE id = $4 RETURNING *`,
      [name.trim(), description?.trim() || null, general_question.trim(), id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Category not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete(`${API_PREFIX}/learning/categories/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`DELETE FROM learning_categories WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
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
    res.status(500).json({ error: "Failed to fetch questions" });
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
    res.status(500).json({ error: "Failed to create question" });
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
    if (!rows[0]) return res.status(404).json({ error: "Question not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update question" });
  }
});

app.delete(`${API_PREFIX}/learning/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`DELETE FROM learning_questions WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete question" });
  }
});

// ── Nhanh Nhu Chop Game APIs ────────────────────────────────────────────────

app.get(`${API_PREFIX}/nhanhnhuchop/questions`, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM nhanh_nhu_chop_questions ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
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
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

app.post(`${API_PREFIX}/contact`, async (req, res) => {
  console.log(`[Contact] Received message from ${req.body?.email || 'unknown'}`);
  const { name, email, phone, message } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin bắt buộc." });
  }

  const adminEmail = process.env.EMAIL_USER;
  if (!adminEmail) {
    console.warn("[Contact API] EMAIL_USER not configured.");
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
    res.status(500).json({ error: "Failed to create question" });
  }
});

app.post(`${API_PREFIX}/nhanhnhuchop/import`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { questions } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "questions array is required" });
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
    await query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: "Failed to bulk import questions" });
  }
});

app.put(`${API_PREFIX}/nhanhnhuchop/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  const { id } = req.params;
  const { question, options, correct_index, explanation, level } = req.body || {};
  if (!question || !Array.isArray(options)) return res.status(400).json({ error: "Question and options required" });

  try {
    const { rows } = await query(
      `UPDATE nhanh_nhu_chop_questions SET question = $1, options = $2, correct_index = $3, explanation = $4, level = $5 
       WHERE id = $6 RETURNING *`,
      [question.trim(), options, correct_index || 0, explanation?.trim() || null, level || 'medium', id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Question not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update question" });
  }
});

app.delete(`${API_PREFIX}/nhanhnhuchop/questions/:id`, async (req, res) => {
  const userId = getUserId(req);
  if (!(await checkAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    await query(`DELETE FROM nhanh_nhu_chop_questions WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete question" });
  }
});

// Catch-all handler to serve index.html for SPA (placed at the end)

app.use((req, res, next) => {
  // If it's an API request that reached here, it's a 404
  if (req.path.startsWith(API_PREFIX)) return res.status(404).json({ error: "Not found" });

  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) {
      // If index.html is missing (e.g. no build), continue to default 404
      next();
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[Global Error Handled]", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
});

// ── Server Initialization & DB Setup ───────────────────────────────────────
async function initializeApp() {
  console.log(`[Server] Initializing database and migrations...`);
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
          console.warn("[Schema Warning] Skipping statement:", stmt.split("\n")[0], 
            isMissingUserId ? "(user_id column missing, will be added by migration)" : "(already exists)");
        } else {
          console.error("[Schema Error] Critical statement failed:", stmt.split("\n")[0], err.message, "Code:", err.code);
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
        console.log("[Seed] Creating default admin...");
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
      console.log("[Migration] Checking user_id columns...");
      const tables = ["subjects", "curricula", "quizlet_sets", "exams"];
      for (const t of tables) {
        try {
          await query(`alter table ${t} add column if not exists user_id uuid references users(id)`);
          await query(`create index if not exists idx_${t}_user_id on ${t}(user_id)`);
        } catch (colErr) {
          console.warn(`[Migration] Could not add user_id to ${t}:`, colErr.message);
        }
      }

      // Add sort_order to subjects if missing
      try {
        await query(`alter table subjects add column if not exists sort_order integer not null default 0`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add sort_order to subjects:`, colErr.message);
      }

      // Add is_active and education_level to users if missing
      console.log("[Migration] Checking users columns...");
      try {
        await query(`alter table users add column if not exists is_active boolean not null default true`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add is_active to users:`, colErr.message);
      }
      try {
        await query(`alter table users add column if not exists education_level text`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add education_level to users:`, colErr.message);
      }

      // Add language column to dictation_exercises if missing
      try {
        await query(`alter table dictation_exercises add column if not exists language text not null default 'vi'`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add language to dictation_exercises:`, colErr.message);
      }

      // ── Pictogram Table Migration ──────────────────────────────────────────
      console.log("[Migration] Checking pictogram_questions table...");
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
        console.warn(`[Migration] Could not create pictogram_questions:`, tabErr.message);
      }

      // Add subject_id to tables if missing
      console.log("[Migration] Checking subject_id, grade, education_level columns...");
      const subjectTables = ["curricula", "quizlet_sets", "exams"];
      for (const t of subjectTables) {
        try {
          await query(`alter table ${t} add column if not exists subject_id uuid references subjects(id) on delete set null`);
          await query(`create index if not exists idx_${t}_subject_id on ${t}(subject_id)`);
        } catch (colErr) {
          console.warn(`[Migration] Could not add subject_id to ${t}:`, colErr.message);
        }
      }

      // Specific columns for quizlet_sets
      try {
        await query(`alter table quizlet_sets add column if not exists grade text`);
        await query(`alter table quizlet_sets add column if not exists education_level text`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add quizlet columns:`, colErr.message);
      }

      // Specific columns for exams
      try {
        await query(`alter table exams add column if not exists grade text`);
        await query(`alter table exams add column if not exists education_level text`);
        await query(`alter table exams add column if not exists is_public boolean default true`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add exam columns:`, colErr.message);
      }

      // Specific columns for curricula
      try {
        await query(`alter table curricula add column if not exists education_level text`);
        await query(`alter table curricula add column if not exists is_public boolean default false`);
      } catch (colErr) {
        console.warn(`[Migration] Could not add curricula columns:`, colErr.message);
      }

      // 3. Migration: Assign orphan records to admin
      console.log("[Migration] Assigning orphan records to admin...");
      await query(`update subjects set user_id = $1 where user_id is null`, [adminId]);
      await query(`update curricula set user_id = $1 where user_id is null`, [adminId]);
      await query(`update quizlet_sets set user_id = $1 where user_id is null`, [adminId]);
      await query(`update exams set user_id = $1 where user_id is null`, [adminId]);
      console.log("[Migration] Done.");

      console.log("[Migration] Converting proverbs level to text...");
      try {
        await query(`alter table proverbs alter column level type text using (case when level=1 then 'easy' when level=2 then 'medium' when level=3 then 'hard' when level=4 then 'extreme' else 'easy' end)`);
        await query(`alter table proverbs alter column level set default 'easy'`);
      } catch (colErr) {
        // Safe to ignore if it's already text
      }

      // ── Learning with Kids Tables ──────────────────────────────────────────
      console.log("[Migration] Checking learning game tables...");
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

// Start the server only after the app is initialized
initializeApp()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] API running on http://localhost:${PORT}${API_PREFIX}`);
    });
  })
  .catch((err) => {
    console.error("[Server] Fatal error during startup:", err);
    process.exit(1);
  });


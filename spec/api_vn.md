# Smart Learn — API Specification

> Base URL: `/api`

## Table of Contents
1. [Authentication & Session](#authentication--session)
2. [Auth](#auth)
   - [POST /register](#post-apiregister)
   - [POST /login](#post-apilogin)
   - [POST /refresh-token](#post-apirefresh-token)
   - [GET /me](#get-apime)
3. [File Upload](#file-upload)
4. [Health Check](#health-check)
5. [System Settings](#system-settings)
   - [GET /settings/default-plan](#get-apisettingsdefault-plan)
   - [PUT /settings/default-plan](#put-apisettingsdefault-plan-admin-only)
5.1 [Plans Management](#plans-management)
   - [GET /plans](#get-apiplans)
   - [GET /admin/plans](#get-apiadminplans-admin-only)
   - [POST /plans](#post-apiplans-admin-only)
   - [PUT /plans/:id](#put-apiplansid-admin-only)
   - [DELETE /plans/:id](#delete-apiplansid-admin-only)
6. [User Management](#user-management)
   - [GET /statistics/users](#get-apistatisticsusers)
   - [GET /users](#get-apiusers)
   - [POST /users](#post-apiusers)
   - [PUT /users/:id](#put-apiusersid)
   - [PUT /users/:id/password](#put-apiusersidpassword)
   - [DELETE /users/:id](#delete-apiusersid)
   - [POST /forgot-password](#post-apiforgot-password)
7. [System Pages](#system-pages)
8. [Subjects](#subjects)
9. [User Subjects](#user-subjects-thiết-định-môn-học-cá-nhân)
10. [Curricula](#curricula)
11. [Lessons](#lessons)
12. [Quizlet (Flashcard Sets)](#quizlet-flashcard-sets)
13. [Exams (Trắc nghiệm)](#exams-trắc-nghiệm)
14. [Games](#games)
    - [Dictation](#dictation-chép-chính-tả)
    - [Pictogram](#pictogram-đuổi-hình- bắt-chữ)
    - [Proverbs](#proverbs-ca-dao-tục-ngữ)
    - [Nhanh Như Chớp](#nhanh-như-chớp-fast-response)
    - [Vua Tiếng Việt](#vua-tiếng-việt)
15. [Learning with Kids](#learning-with-kids-học-cùng-bé)
16. [Contact](#contact)

---

## Authentication & Session

All endpoints (except `/register` and `/login`) require the following headers:

| Header            | Type   | Description                    |
|-------------------|--------|--------------------------------|
| `x-session-token` | string | Active session token (Access Token) |
| `x-user-id`       | UUID   | The logged-in user's ID           |

To ensure API security, you must also provide the API Key header in **all** requests to `/api/*` if the server is configured with `VITE_API_KEY`:

| Header            | Type   | Description                    |
|-------------------|--------|--------------------------------|
| `x-api-key`       | string | Expected API key from `.env`   |

### ⏳ Session Expiration & Refresh
- **Access Token**: Valid for **1 day**. If expired, the server returns `401 Unauthorized` with `{ "error": "TOKEN_EXPIRED" }`.
- **Refresh Token**: Valid for **30 days**. Used to obtain a new set of tokens.
- **Rotation**: Every time you refresh, you get a **new** Access Token AND a **new** Refresh Token.
- **Single Session**: A new login on a new device will invalidate all previous session/refresh tokens for that user.

---

## 🔐 Auth

### `POST /api/register`
Create a new user account.

**Request Body:**
| Field              | Type    | Required | Default       |
|--------------------|---------|----------|---------------|
| `username`         | string  | ✅       |               |
| `email`            | string  | ✅       |               |
| `password`         | string  | ✅       |               |
| `display_name`     | string  | ❌       | = username    |
| `education_level`  | string  | ❌       | "Tiểu học"    |

**Response:** `201 Created`
Sends a welcome email upon success.

**Logic gán gói cước khi đăng ký (theo thứ tự ưu tiên):**
1. Lấy tên gói mặc định từ `system_settings` (key = `default_user_plan`). Fallback: `"Miễn phí"`.
2. Tra cứu `duration_days` của gói đó trong bảng `subscription_plans`. Fallback: `6` ngày.
3. Tính `plan_end_date` = `NOW() + duration_days days`.

> **Lưu ý:** Số ngày hiệu lực **không còn hardcoded** theo tên gói. Mọi thay đổi thời hạn cần được cập nhật tại `subscription_plans.duration_days`.

**Response body:**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "role": "user",
  "educationLevel": "string",
  "isActive": true,
  "plan": "Miễn phí",
  "planStartDate": "timestamp",
  "planEndDate": "timestamp",
  "createdAt": "timestamp",
  "sessionToken": "uuid",
  "refreshToken": "uuid",
  "accessTokenExpiresAt": "timestamp"
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `username`, `email` hoặc `password` | `"Missing required fields"` | Vui lòng điền đầy đủ thông tin bắt buộc |
| `400` | `username` hoặc `email` đã tồn tại | `"Username or email already exists"` | Tên đăng nhập hoặc email đã được sử dụng |
| `500` | Lỗi server | `"Registration failed"` | Đăng ký thất bại, vui lòng thử lại sau |

---

### `POST /api/login`
Authenticate a user and start a session.

**Request Body:**
| Field      | Type   | Required |
|------------|--------|----------|
| `username` | string | ✅       |
| `password` | string | ✅       |

**Response:** `200 OK` — Same structure as register response (includes `sessionToken`, `refreshToken`, and `accessTokenExpiresAt`).

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `username` hoặc `password` | `"Missing credentials"` | Vui lòng nhập tên đăng nhập và mật khẩu |
| `401` | Sai tên đăng nhập hoặc mật khẩu | `"Invalid username or password"` | Tên đăng nhập hoặc mật khẩu không đúng |
| `403` | Tài khoản bị khóa (`is_active = false`) | `"Tài khoản của bạn đã bị khóa."` | Tài khoản của bạn đã bị khóa |
| `500` | Lỗi server | `"Login failed"` | Đăng nhập thất bại, vui lòng thử lại sau |

---

### `POST /api/refresh-token`
Obtain a new Access Token and Refresh Token (Rotation).

**Request Body:**
| Field          | Type   | Required |
|----------------|--------|----------|
| `userId`       | UUID   | ✅       |
| `refreshToken` | string | ✅       |

**Response:** `200 OK`
```json
{
  "sessionToken": "uuid",
  "refreshToken": "uuid",
  "accessTokenExpiresAt": "timestamp"
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `userId` hoặc `refreshToken` | `"Missing data"` | Vui lòng cung cấp đầy đủ thông tin |
| `400` | `userId` không đúng định dạng UUID | `"ID người dùng không hợp lệ"` | ID người dùng không đúng định dạng |
| `401` | Refresh token không hợp lệ | `"Invalid refresh token"` | Refresh token không hợp lệ |
| `401` | Refresh token đã hết hạn (> 30 ngày) | `"Refresh token expired"` | Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại |
| `500` | Lỗi server | `"Refresh failed"` | Làm mới token thất bại, vui lòng thử lại sau |

---

### `GET /api/me`
Fetch the current authenticated user's profile and membership details from the database. This ensures the frontend has the most up-to-date data for the profile page.

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "role": "admin | user | teacher",
  "educationLevel": "string | null",
  "isActive": true,
  "plan": "string",
  "planStartDate": "timestamp | null",
  "planEndDate": "timestamp | null",
  "avatarUrl": "string | null",
  "createdAt": "timestamp"
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `401` | Thiếu header `x-user-id` | `"Unauthorized"` | Bạn không có quyền truy cập |
| `404` | Không tìm thấy user trong DB | `"User not found"` | Không tìm thấy thông tin người dùng |
| `500` | Lỗi server | `"Failed to fetch user profile"` | Lấy thông tin người dùng thất bại, vui lòng thử lại sau |

---

## 📁 File Upload

### `POST /api/upload`
Upload a single file (generic).

**Request:** `multipart/form-data` with field `file`.

**Response:** `200 OK`
```json
{ "url": "/uploads/filename.ext" }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `413` | File vượt quá 10MB | `"File quá lớn. Giới hạn tối đa là 10MB."` | File quá lớn, dung lượng tối đa cho phép là 10MB |
| `400` | Lỗi upload khác (multer) | `"<chi tiết lỗi>"` | Tải file thất bại: <chi tiết lỗi> |
| `400` | Không có file được gửi lên | `"No file uploaded"` | Vui lòng chọn file để tải lên |

## 🩺 Health Check

### `GET /api/health`
**Response:** `200 OK`
```json
{ "ok": true }
```

---

## ⚙️ System Settings

### `GET /api/settings/default-plan`
Fetch the current default plan for new users.

**Response:** `200 OK`
```json
{ "plan": "Miễn phí" }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to get default plan"` | Lấy gói dịch vụ mặc định thất bại, vui lòng thử lại sau |

### `PUT /api/settings/default-plan` *(Admin only)*
Update the default plan for new users.

**Request Body:**
| Field  | Type   | Required |
|--------|--------|----------|
| `plan` | string | ✅       |

**Response:** `200 OK`
```json
{ "plan": "1 tháng" }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu trường `plan` | `"Missing plan"` | Vui lòng chọn gói dịch vụ |
| `500` | Lỗi server | `"Failed to update default plan"` | Cập nhật gói dịch vụ thất bại, vui lòng thử lại sau |

## 💼 Plans Management

### `GET /api/plans`
Fetch all active subscription plans sorted by sort_order.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "string",
    "durationDays": 30,
    "price": 0,
    "description": "string | null",
    "isActive": true,
    "sortOrder": 0,
    "isPremium": true
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Không thể tải danh sách gói cước: <chi tiết>"` | Không thể tải danh sách gói cước, vui lòng thử lại sau |

### `GET /api/admin/plans` *(Admin only)*
Fetch all subscription plans including inactive ones.

**Response:** `200 OK`

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `500` | Lỗi server | `"Không thể tải danh sách gói cước (admin): <chi tiết>"` | Không thể tải danh sách gói cước (admin), vui lòng thử lại sau |

### `POST /api/plans` *(Admin only)*
Create a new subscription plan.

**Request Body:**
| Field             | Type    | Required | Default |
|-------------------|---------|----------|---------|
| `name`            | string  | ✅       |         |
| `price`           | number  | ✅       |         |
| `duration_months` | number  | ✅       |         |
| `features`        | array   | ❌       | []      |
| `is_premium`      | boolean | ❌       | false   |
| `is_active`       | boolean | ❌       | true    |

**Response:** `201 Created`

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `400` | Thiếu `name` hoặc `durationDays` | `"Name and durationDays are required"` | Vui lòng nhập tên gói và số ngày hiệu lực |
| `400` | Tên gói cước đã tồn tại | `"Tên gói cước đã tồn tại"` | Tên gói cước này đã tồn tại trong hệ thống |
| `500` | Lỗi server | `"Không thể tạo gói cước: <chi tiết>"` | Tạo gói cước thất bại, vui lòng thử lại sau |

### `PUT /api/plans/:id` *(Admin only)*
Update an existing subscription plan.

**Request Body:** Same as `POST /api/plans`.

**Response:** `200 OK`

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `400` | Thiếu `name` hoặc `durationDays` | `"Name and durationDays are required"` | Vui lòng nhập tên gói và số ngày hiệu lực |
| `404` | Gói cước không tồn tại | `"Gói cước không tồn tại"` | Gói cước không tồn tại trong hệ thống |
| `500` | Lỗi server | `"Không thể cập nhật gói cước: <chi tiết>"` | Cập nhật gói cước thất bại, vui lòng thử lại sau |

### `DELETE /api/plans/:id` *(Admin only)*
Delete a subscription plan.

**Response:** `204 No Content`

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `500` | Lỗi server | `"Failed to delete plan"` | Xóa gói cước thất bại, vui lòng thử lại sau |

## 👥 User Management

### `GET /api/statistics/users`
Get aggregated statistics of all users, including their activity metrics (lesson, flashcard, and quiz counts) and last login time. (Admin only)

**Response:** `200 OK` — Array of user objects with statistics.
```json
[
  {
    "id": "uuid",
    "username": "string",
    "displayName": "string",
    "plan": "string",
    "planEndDate": "timestamp | null",
    "lastLogin": "timestamp | null",
    "lessonCount": 0,
    "flashcardCount": 0,
    "quizCount": 0
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden: Admins only"` | Chỉ quản trị viên mới có quyền truy cập |
| `500` | Lỗi server | `"Failed to fetch user statistics"` | Lấy thống kê người dùng thất bại, vui lòng thử lại sau |

---

### `GET /api/statistics/monthly-summary`
Get aggregated new user, login, and deleted user counts for the current and previous calendar month. (Admin only)

**Response:** `200 OK`
```json
{
  "currentMonth": {
    "newUsers": 5,
    "loginUsers": 42,
    "deletedUsers": 1
  },
  "previousMonth": {
    "newUsers": 8,
    "loginUsers": 37,
    "deletedUsers": 0
  }
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden: Admins only"` | Chỉ quản trị viên mới có quyền truy cập |
| `500` | Lỗi server | `"Failed to fetch monthly summary"` | Lấy thống kê hàng tháng thất bại, vui lòng thử lại sau |

---

### `GET /api/users`
List all users with pagination and filtering. (Admin use)

**Query Params:**
| Param      | Type   | Required | Default | Description             |
|------------|--------|----------|---------|-------------------------|
| `page`     | number | ❌       | 1       |                         |
| `limit`    | number | ❌       | 30      |                         |
| `username` | string | ❌       |         | Search by username/name |
| `level`    | string | ❌       |         | Filter by education level|
| `role`     | string | ❌       |         | Filter by role          |
| `plan`     | string | ❌       |         | Filter by plan          |

**Response:** `200 OK` — Paginated user objects and global stats.
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "displayName": "string",
      "role": "admin | user | teacher",
      "educationLevel": "string | null",
      "isActive": true,
      "plan": "string",
      "planStartDate": "timestamp | null",
      "planEndDate": "timestamp | null",
      "createdAt": "timestamp"
    }
  ],
  "total": 100,
  "totalPages": 4,
  "page": 1,
  "limit": 30,
  "stats": {
    "adminCount": 2,
    "userCount": 98,
    "totalCount": 100
  }
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch users"` | Lấy danh sách người dùng thất bại, vui lòng thử lại sau |

---

### `POST /api/users` *(Admin only)*
Create a user manually (Admin use).

**Request Body:**
| Field              | Type    | Required | Default       |
|--------------------|---------|----------|---------------|
| `username`         | string  | ✅       |               |
| `password`         | string  | ✅       |               |
| `email`            | string  | ❌       | ""            |
| `display_name`     | string  | ❌       | = username    |
| `role`             | string  | ❌       | "user"        |
| `education_level`  | string  | ❌       | null          |
| `plan`             | string  | ❌       | "Miễn phí"    |
| `plan_start_date`  | string  | ❌       | null          |
| `plan_end_date`    | string  | ❌       | null          |

**Response:** `201 Created` — User object. Sets `plan_start_date` (NOW) and `plan_end_date` (+6 days) if not provided. Sends a welcome email to the new user.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `username` hoặc `password` | `"Missing fields"` | Vui lòng điền đầy đủ thông tin bắt buộc |
| `500` | Lỗi server | `"Failed to create user"` | Tạo người dùng thất bại, vui lòng thử lại sau |

### `PUT /api/users/:id`
Update a user's profile, role, or subscription.

**URL Params:** `id` (UUID)

**Request Body:**
| Field              | Type    | Required | Default       |
|--------------------|---------|----------|---------------|
| `email`            | string  | ❌       | ""            |
| `display_name`     | string  | ❌       | ""            |
| `role`             | string  | ❌       | "user"        |
| `education_level`  | string  | ❌       | null          |
| `avatar_url`       | string  | ❌       | null          |
| `is_active`        | boolean | ❌       | true          |
| `plan`             | string  | ❌       | "Miễn phí"    |
| `plan_start_date`  | string  | ❌       | null          |
| `plan_end_date`    | string  | ❌       | null          |

**Response:** `200 OK` — Updated user object (includes `avatarUrl`).

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy user | `"User not found"` | Không tìm thấy thông tin người dùng |
| `500` | Lỗi server | `"Failed to update user"` | Cập nhật người dùng thất bại, vui lòng thử lại sau |

### `PUT /api/users/:id/password`
Reset a user's password.

**Request Body:**
| Field      | Type   | Required |
|------------|--------|----------|
| `password` | string | ✅       |

**Response:** `200 OK`
```json
{ "ok": true }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `password` | `"Password required"` | Vui lòng nhập mật khẩu mới |
| `500` | Lỗi server | `"Failed to change password"` | Đổi mật khẩu thất bại, vui lòng thử lại sau |

---

### `DELETE /api/users/:id`
Delete a user account. Cannot delete the root admin (`adminsmart`).

**Response:** `204 No Content`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Người dùng không phải admin và xóa tài khoản người khác | `"Forbidden: You can only delete your own account"` | Bạn chỉ có thể xóa tài khoản của chính mình |
| `403` | Xóa tài khoản root admin (`adminsmart`) | `"Cannot delete the root admin account"` | Không thể xóa tài khoản quản trị viên gốc |
| `500` | Lỗi server | `"Failed to delete user"` | Xóa người dùng thất bại, vui lòng thử lại sau |

---

### `POST /api/forgot-password`
Generates a random 8-character password, updates it in the database, and sends it to the user's email.

**Request Body:**
| Field   | Type   | Required |
|---------|--------|----------|
| `email` | string | ✅       |

**Response:** `200 OK`
```json
{ "message": "Mật khẩu mới đã được gửi vào Email. Truy cập vào Email đăng ký để lấy mật khẩu mới." }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu hoặc email rỗng | `"Vui lòng nhập địa chỉ email."` | Vui lòng nhập địa chỉ email |
| `404` | Email không tồn tại trong hệ thống | `"Email không tồn tại trong hệ thống."` | Email này không tồn tại trong hệ thống |
| `500` | Lỗi server | `"Có lỗi xảy ra trong quá trình khôi phục mật khẩu."` | Khôi phục mật khẩu thất bại, vui lòng thử lại sau |

---

## 🛠️ System Pages

### `GET /api/system-pages`
List all static pages (slug and title).

**Response:** `200 OK`
```json
[
  { "slug": "string", "title": "string", "updated_at": "timestamp" }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch pages"` | Lấy danh sách trang thất bại, vui lòng thử lại sau |

---

### `GET /api/system-pages/:slug`
Fetch content for a specific static page.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "slug": "string",
  "title": "string",
  "content": "string",
  "updated_at": "timestamp"
}
```

> **Note:** Nếu slug không tồn tại, API trả về `{ "title": "", "content": "", "slug": "..." }` thay vì 404.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch page"` | Lấy nội dung trang thất bại, vui lòng thử lại sau |

---

### `POST /api/system-pages` *(Admin only)*
Create or update a static page (Upsert).

**Request Body:**
| Field   | Type   | Required |
|---------|--------|----------|
| `slug`    | string | ✅       |
| `title`   | string | ✅       |
| `content` | string | ❌       |

**Response:** `200 OK` — Page object.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Unauthorized"` | Bạn không có quyền truy cập |
| `400` | Thiếu `slug` hoặc `title` | `"Slug and title are required"` | Vui lòng nhập slug và tiêu đề trang |
| `500` | Lỗi server | `"Failed to update page"` | Cập nhật trang thất bại, vui lòng thử lại sau |

## 📚 Subjects

### `GET /api/subjects`
List all subjects with curriculum count.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "icon": "string | null",
    "user_id": "uuid",
    "created_by": "string | null",
    "sort_order": 0,
    "curriculum_count": 3,
    "created_at": "timestamp"
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch subjects"` | Lấy danh sách môn học thất bại, vui lòng thử lại sau |

---

### `GET /api/subjects/:id`
Get a single subject with its curriculum count.

**Response:** `200 OK` — Single subject object.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy subject | `"Subject not found"` | Không tìm thấy môn học |
| `500` | Lỗi server | `"Failed to fetch subject"` |  |

---

### `POST /api/subjects` *(Admin only)*
Create a new subject.

**Request Body:**
| Field         | Type   | Required |
|---------------|--------|----------|
| `name`        | string | ✅       |
| `description` | string | ❌       |
| `icon`        | string | ❌       |
| `created_by`  | string | ❌       |

**Response:** `201 Created` — Subject object.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Only admins can create subjects"` | Chỉ quản trị viên mới có quyền tạo môn học |
| `400` | Thiếu `name` | `"name is required"` | Vui lòng nhập tên |
| `500` | Lỗi server | `"Failed to create subject"` | Tạo môn học thất bại, vui lòng thử lại sau |

---

### `PUT /api/subjects/:id` *(Admin only)*
Update a subject.

**Request Body:** Same as POST (except `created_by`).

**Response:** `200 OK` — Updated subject.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `403` | Không phải admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `400` | Thiếu `name` | `"name is required"` | Vui lòng nhập tên |
| `404` | Không tìm thấy subject | `"Subject not found"` | Không tìm thấy môn học |
| `500` | Lỗi server | `"Failed to update subject"` | Cập nhật môn học thất bại, vui lòng thử lại sau |

---

### `PUT /api/subjects/reorder` *(Admin only)*
Reorder subjects.

**Request Body:**
```json
{
  "orders": [
    { "id": "uuid", "sort_order": 0 },
    { "id": "uuid", "sort_order": 1 }
  ]
}
```

**Response:** `200 OK` — `{ "ok": true }`.

---

### `DELETE /api/subjects/:id` *(Admin only)*
Delete a subject.

**Response:** `204 No Content`.

---

## 🎯 User Subjects (Thiết định môn học cá nhân)

### `GET /api/user-subjects`
Lấy danh sách các môn học mà người dùng hiện tại đã chọn đưa vào sổ tay. Chỉ trả về những môn học đã được chọn, kèm số lượng chương trình học của từng môn.

**Headers:** Yêu cầu `x-user-id` và `x-session-token`.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "icon": "string | null",
    "user_id": "uuid",
    "created_by": "string | null",
    "sort_order": 0,
    "curriculum_count": 3,
    "created_at": "timestamp"
  }
]
```

> Trả về mảng rỗng `[]` nếu người dùng chưa chọn môn nào.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `401` | Không có `x-user-id` | `"Unauthorized"` | Bạn không có quyền truy cập |
| `500` | Lỗi server | `"Failed to fetch user subjects"` | Lấy danh sách môn học cá nhân thất bại, vui lòng thử lại sau |

---

### `POST /api/user-subjects`
Cập nhật lại toàn bộ danh sách môn học mà người dùng đã chọn. Thực hiện xóa toàn bộ lựa chọn cũ và thêm mới theo danh sách gửi lên (Transactional).

**Headers:** Yêu cầu `x-user-id` và `x-session-token`.

**Request Body:**
| Field         | Type     | Required | Description                       |
|---------------|----------|----------|-----------------------------------|
| `subject_ids` | UUID[]   | ✅       | Mảng ID các môn học được chọn     |

```json
{
  "subject_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:** `200 OK`
```json
{ "ok": true }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `401` | Không có `x-user-id` | `"Unauthorized"` | Bạn không có quyền truy cập |
| `400` | `subject_ids` không phải array | `"subject_ids must be an array"` | Danh sách môn học phải là một mảng hợp lệ |
| `500` | Lỗi server | `"Failed to update user subjects"` | Cập nhật môn học cá nhân thất bại, vui lòng thử lại sau |

---

## 📖 Curricula

### `GET /api/curricula`
List curricula, optionally filtered by subject.

**Query Params:**
| Param        | Type | Required |
|--------------|------|----------|
| `subject_id` | UUID | ❌       |

> **Note**: This query joins `curricula` with `users` on `user_id` (UUID) to safely provide author metadata without type mismatch errors.

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "subject_id": "uuid",
    "name": "string",
    "grade": "string | null",
    "education_level": "string | null",
    "is_public": false,
    "publisher": "string | null",
    "lesson_count": 12,
    "file_url": "string | null",
    "file_content": "string | null",
    "image_url": "string | null",
    "sort_order": 0,
    "user_id": "uuid",
    "created_by": "string | null",
    "authorName": "string | null",
    "authorAvatar": "string | null",
    "authorRole": "string | null",
    "created_at": "timestamp"
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch curricula"` | Lấy danh sách chương trình học thất bại, vui lòng thử lại sau |

---

### `GET /api/curricula/:id`
Get a single curriculum with author metadata.

**Response:** `200 OK` — Single curriculum object.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy curriculum | `"Curriculum not found"` | Không tìm thấy chương trình học |
| `500` | Lỗi server | `"Failed to fetch curriculum"` |  |

---

### `POST /api/curricula` *(Auth required)*
Create a curriculum. Supports optional file upload.

**Request:** `multipart/form-data` or JSON.

| Field              | Type    | Required |
|--------------------|---------|----------|
| `subject_id`       | UUID    | ✅       |
| `name`             | string  | ✅       |
| `grade`            | string  | ❌       |
| `education_level`  | string  | ❌       |
| `is_public`        | boolean | ❌       |
| `publisher`        | string  | ❌       |
| `lesson_count`     | number  | ❌       |
| `image_url`        | string  | ❌       |
| `file_content`     | string  | ❌       |
| `created_by`       | string  | ❌       |
| `file` (multipart) | File    | ❌       |

**Response:** `201 Created`.

---

### `PUT /api/curricula/:id` *(Owner or Admin)*
Update a curriculum. Ownership check: only the creator or an admin can edit.

**Request Body:** Same fields as POST (minus `subject_id`).

**Response:** `200 OK`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `401` | Chưa đăng nhập | `"Unauthorized"` | Bạn không có quyền truy cập |
| `404` | Không tìm thấy curriculum | `"Curriculum not found"` | Không tìm thấy chương trình học |
| `403` | Không phải owner hoặc admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `400` | Thiếu `name` | `"name is required"` | Vui lòng nhập tên |
| `500` | Lỗi server | `"Failed to update curriculum"` | Cập nhật chương trình học thất bại, vui lòng thử lại sau |

---

### `POST /api/curricula/reorder` *(Auth required)*
Reorder curricula within a subject.

**Request Body:**
```json
{ "order": ["uuid-1", "uuid-2", "uuid-3"] }
```

**Response:** `200 OK` — `{ "success": true }`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `401` | Chưa đăng nhập | `"Unauthorized"` | Bạn không có quyền truy cập |
| `400` | `order` không hợp lệ | `"Invalid order format"` | Định dạng thứ tự không hợp lệ |
| `500` | Lỗi server | `"Failed to reorder curricula"` | Sắp xếp lại chương trình học thất bại, vui lòng thử lại sau |

---

### `DELETE /api/curricula/:id` *(Owner or Admin)*
Delete a curriculum.

**Response:** `204 No Content`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `401` | Chưa đăng nhập | `"Unauthorized"` | Bạn không có quyền truy cập |
| `403` | Không phải owner hoặc admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `500` | Lỗi server | `"Failed to delete curriculum"` | Xóa chương trình học thất bại, vui lòng thử lại sau |

---

### `GET /api/lessons`
List lessons for a curriculum with embedded quiz and flashcard data.

**Query Params:**
| Param           | Type | Required |
|-----------------|------|----------|
| `curriculum_id` | UUID | ❌       |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "curriculum_id": "uuid",
    "title": "string",
    "description": "string | null",
    "content": [],
    "summary": "string | null",
    "key_points": [],
    "vocabulary": [],
    "sort_order": 0,
    "quiz": [
      {
        "id": "string",
        "question": "string",
        "options": [],
        "correctIndex": 0,
        "explanation": "string"
      }
    ],
    "flashcards": [
      { "id": "string", "front": "string", "back": "string" }
    ],
    "created_at": "timestamp"
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch lessons"` | Lấy danh sách bài học thất bại, vui lòng thử lại sau |

---

### `GET /api/lessons/:id`
Get a single lesson with quiz/flashcard data.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy lesson | `"Lesson not found"` | Không tìm thấy bài học |
| `500` | Lỗi server | `"Failed to fetch lesson"` |  |

### `POST /api/lessons`
Create a new lesson.

**Request Body:**
| Field           | Type     | Required |
|-----------------|----------|----------|
| `curriculum_id` | UUID     | ✅       |
| `title`         | string   | ✅       |
| `description`   | string   | ❌       |
| `content`       | jsonb    | ❌       |
| `summary`       | string   | ❌       |
| `key_points`    | string[] | ❌       |
| `vocabulary`    | jsonb    | ❌       |
| `sort_order`    | number   | ❌       |

**Response:** `201 Created`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `curriculum_id` | `"curriculum_id is required"` | Vui lòng cung cấp ID chương trình học |
| `400` | Thiếu `title` | `"title is required"` | Vui lòng nhập tiêu đề |
| `500` | Lỗi server | `"Failed to create lesson"` | Tạo bài học thất bại, vui lòng thử lại sau |

---

### `PUT /api/lessons/:id`
Update a lesson.

**Request Body:** Same as POST (without `curriculum_id`).

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `title` | `"title is required"` | Vui lòng nhập tiêu đề |
| `404` | Không tìm thấy lesson | `"Lesson not found"` | Không tìm thấy bài học |
| `500` | Lỗi server | `"Failed to update lesson"` | Cập nhật bài học thất bại, vui lòng thử lại sau |

---

### `DELETE /api/lessons/:id`
Delete a lesson.

**Response:** `204 No Content`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to delete lesson"` | Xóa bài học thất bại, vui lòng thử lại sau |

---

### `PUT /api/lessons/:id/quiz-flashcards`
Replace all quiz questions and flashcards for a lesson (transactional).

**Request Body:**
```json
{
  "quiz": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ],
  "flashcards": [
    { "front": "string", "back": "string" }
  ]
}
```

**Response:** `200 OK` — `{ "ok": true }`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to save quiz/flashcards"` | Lưu bài kiểm tra/thẻ học thất bại, vui lòng thử lại sau |

---

## 🖼️ Lesson Images

### `GET /api/lessons/:id/images`
Get all images for a lesson, sorted by `sort_order`.

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "lesson_id": "string",
    "file_url": "/uploads/...",
    "caption": "string | null",
    "sort_order": 0,
    "created_at": "timestamp"
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to fetch lesson images"` | Lấy ảnh bài học thất bại, vui lòng thử lại sau |

---

### `POST /api/lessons/:id/images`
Upload up to 20 images for a lesson.

**Request:** `multipart/form-data`, field name `images`.

**Response:** `201 Created` — Array of inserted image records.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `413` | File vượt quá 10MB mỗi ảnh | `"File quá lớn. Giới hạn tối đa là 10MB mỗi ảnh."` | File quá lớn, dung lượng tối đa mỗi ảnh là 10MB |
| `400` | Lỗi upload khác | `"<chi tiết lỗi>"` | Tải file thất bại: <chi tiết lỗi> |
| `400` | Không có file được gửi lên | `"No files uploaded"` | Vui lòng chọn ít nhất một file để tải lên |
| `500` | Lỗi server | `"Failed to upload lesson images"` | Tải ảnh bài học thất bại, vui lòng thử lại sau |

---

### `DELETE /api/lessons/:id/images/:imageId`
Delete a single lesson image (also removes the file from disk).

**Response:** `204 No Content`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to delete lesson image"` | Xóa ảnh bài học thất bại, vui lòng thử lại sau |

## 📊 Progress Tracking

### `GET /api/progress`
Get lesson completion status for a student.

**Query Params:**
| Param        | Type   | Required |
|--------------|--------|----------|
| `student_id` | string | ✅       |

**Response:** `200 OK`
```json
[
  {
    "lesson_id": "string",
    "completed": true,
    "completed_at": "timestamp | null"
  }
]
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `student_id` | `"student_id is required"` | Vui lòng cung cấp ID học sinh |
| `500` | Lỗi server | `"Failed to fetch progress"` | Lấy tiến độ học tập thất bại, vui lòng thử lại sau |

### `PUT /api/progress/:lessonId`
Toggle lesson completion for a student.

**Request Body:**
| Field        | Type    | Required |
|--------------|---------|----------|
| `student_id` | string  | ✅       |
| `completed`  | boolean | ✅       |

**Response:** `200 OK` — Updated progress record.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `student_id` | `"student_id is required"` | Vui lòng cung cấp ID học sinh |
| `500` | Lỗi server | `"Failed to save progress"` | Lưu tiến độ học tập thất bại, vui lòng thử lại sau |

---

## 🗂️ Quizlet (Flashcard Sets)

### `GET /api/quizlets`
List flashcard sets with tab-based filtering and automatic education level matching.

**Query Params:**
| Param | Type   | Required | Description |
|-------|--------|----------|-------------|
| `tab` | string | ❌       | `personal` (user's own) or `community` (public matching user's level) |

**Notes:**
- `tab=personal`: Returns all sets where `user_id` matches the authenticated user.
- `tab=community`: Returns all sets where `is_public` is `true`. For non-admin users, `education_level` must also exactly match the authenticated user's `education_level`. Admins see all levels.
- If no `tab` is provided, the API falls back to returning all sets the user has access to (own + public).

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy user | `"User not found"` | Không tìm thấy thông tin người dùng |
| `500` | Lỗi server | `"Failed to fetch quizlet sets"` | Lấy danh sách bộ thẻ học thất bại, vui lòng thử lại sau |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "string",
    "subject_name": "string | null",
    "education_level": "string | null",
    "is_public": true,
    "user_id": "uuid",
    "term_count": 24,
    "author_name": "string",
    "created_at": "timestamp"
  }
]
```

---

### `GET /api/quizlets/:id`
Get a single set with all terms. Permission-checked.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "subject_name": "string | null",
  "terms": [
    {
      "id": "uuid",
      "term": "string",
      "definition": "string",
      "image_url": "string | null",
      "sort_order": 0
    }
  ]
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy hoặc không có quyền | `"Quizlet set not found or permission denied"` |  |
| `500` | Lỗi server | `"Failed to fetch quizlet set"` |  |

---

### `POST /api/quizlets`
Create a new flashcard set with terms (transactional).

**Request Body:**
| Field              | Type    | Required |
|--------------------|---------|----------|
| `title`            | string  | ✅       |
| `description`      | string  | ❌       |
| `subject_id`       | UUID    | ❌       |
| `grade`            | string  | ❌       |
| `education_level`  | string  | ❌       |
| `is_public`        | boolean | ❌       |
| `created_by`       | string  | ❌       |
| `terms`            | array   | ❌       |

Each term: `{ term, definition, image_url }`.

**Response:** `201 Created` — `{ "id": "uuid" }`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `title` | `"title is required"` | Vui lòng nhập tiêu đề |
| `500` | Lỗi server | `"Failed to create quizlet set"` |  |

---

### `PUT /api/quizlets/:id`
Update a set and replace all terms (transactional, permission-checked).

**Request Body:** Same as POST.

**Response:** `200 OK`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy quizlet set | `"Quizlet set not found"` | Không tìm thấy bộ thẻ học |
| `403` | Không phải owner hoặc admin | `"Forbidden"` | Bạn không có quyền thực hiện thao tác này |
| `500` | Lỗi server | `"Failed to update quizlet set"` |  |

---

### `DELETE /api/quizlets/:id`
Delete a set and all its terms (permission-checked).

**Response:** `204 No Content`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy hoặc không có quyền | `"Quizlet set not found"` | Không tìm thấy bộ thẻ học |
| `500` | Lỗi server | `"Failed to delete quizlet set"` | Xóa bộ thẻ học thất bại, vui lòng thử lại sau |

---

## 📝 Exams (Trắc nghiệm)

### `GET /api/exams`
List all exams with tab-based filtering and automatic education level matching. Includes `question_count` and `average_score`.

**Query Params:**
| Param | Type   | Required | Description |
|-------|--------|----------|-------------|
| `tab` | string | ❌       | `personal` (user's own) or `community` (public matching user's level) |

**Notes:**
- `tab=personal`: Returns all exams where `user_id` matches the authenticated user.
- `tab=community`: Returns all exams where `is_public` is `true`. For non-admin users, `education_level` must also exactly match the authenticated user's `education_level`. Admins see all levels.
- If no `tab` is provided, the API falls back to returning all exams the user has access to (own + public).

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string | null",
    "duration": 30,
    "subject_name": "string | null",
    "question_count": "10",
    "average_score": "85",
    "author_name": "string",
    "is_public": true,
    "created_at": "timestamp"
  }
]
```

---

### `GET /api/exams/:id`
Get a single exam with all questions and options (permission-checked).

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "string",
  "questions": [
    {
      "id": "uuid",
      "content": "string",
      "type": "single | multiple | text | ordering",
      "sort_order": 0,
      "options": [
        { "id": "uuid", "content": "string", "is_correct": false, "sort_order": 0 }
      ]
    }
  ]
}
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy hoặc không có quyền | `"Exam not found or permission denied"` | Không tìm thấy đề thi hoặc bạn không có quyền truy cập |
| `500` | Lỗi server | `"Failed to fetch exam details"` | Lấy chi tiết đề thi thất bại, vui lòng thử lại sau |

---

### `POST /api/exams`
Create a new exam with questions and options (transactional).

**Request Body:**
| Field              | Type    | Required |
|--------------------|---------|----------|
| `title`            | string  | ✅       |
| `description`      | string  | ❌       |
| `duration`         | number  | ❌       |
| `subject_id`       | UUID    | ❌       |
| `grade`            | string  | ❌       |
| `education_level`  | string  | ❌       |
| `is_public`        | boolean | ❌       |
| `questions`        | array   | ❌       |

Each question: `{ content, type, options: [{ content, is_correct }] }`. (Note: type can be `single`, `multiple`, `text`, or `ordering`).

**Response:** `201 Created` — `{ "id": "uuid" }`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `500` | Lỗi server | `"Failed to create exam"` | Tạo đề thi thất bại, vui lòng thử lại sau |

---

### `PUT /api/exams/:id`
Update an exam, replacing all questions (transactional, permission-checked).

**Request Body:** Same as POST.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy hoặc không có quyền | `"Exam not found or permission denied"` (thrown internally, wrapped in 500) |
| `500` | Lỗi server | `"Failed to update exam"` hoặc `"Exam not found or permission denied"` | Không tìm thấy đề thi hoặc bạn không có quyền truy cập |

---

### `DELETE /api/exams/:id`
Delete an exam (permission-checked).

**Response:** `204 No Content`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `404` | Không tìm thấy hoặc không có quyền | `"Exam not found or permission denied"` | Không tìm thấy đề thi hoặc bạn không có quyền truy cập |
| `500` | Lỗi server | `"Failed to delete exam"` | Xóa đề thi thất bại, vui lòng thử lại sau |

---

### `POST /api/exams/:id/results`
Save a student's exam attempt.

**Request Body:**
| Field       | Type   | Required |
|-------------|--------|----------|
| `score`     | number | ✅       |
| `timeTaken` | number | ✅       |

**Response:** `201 Created` — `{ "id": "uuid" }`.

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `score` hoặc `timeTaken` | `"Missing score or timeTaken"` | Vui lòng cung cấp điểm số và thời gian làm bài |
| `500` | Lỗi server | `"Failed to save exam result"` | Lưu kết quả thi thất bại, vui lòng thử lại sau |

---

## 🎮 Games

### Dictation (Chép chính tả)

#### `GET /api/dictation`
List all dictation exercises with author info.

**Response:** `200 OK` — Array of exercise objects.

#### `GET /api/dictation/random`
Get a random exercise filtered by level/language.

**Query Params:**
| Param      | Type   | Required |
|------------|--------|----------|
| `level`    | string | ❌       |
| `language` | string | ❌       |

**Response:** `200 OK` — Single exercise object.

#### `POST /api/dictation`
Create a dictation exercise.

**Request Body:**
| Field      | Type   | Required |
|------------|--------|----------|
| `title`    | string | ✅       |
| `level`    | string | ✅       |
| `content`  | string | ✅       |
| `language` | string | ❌ (default: "vi") |

**Response:** `201 Created`.

#### `PUT /api/dictation/:id`
Update a dictation exercise. Same body as POST.

#### `DELETE /api/dictation/:id`
Delete a dictation exercise.

**Response:** `200 OK` — `{ "ok": true }`.

---

### Pictogram (Đuổi hình bắt chữ)

#### `GET /api/pictogram`
List all pictogram questions with author info.

#### `GET /api/pictogram/play`
Get random questions for gameplay.

**Query Params:**
| Param   | Type   | Required | Default |
|---------|--------|----------|---------|
| `level` | string | ❌       |         |
| `limit` | number | ❌       | 5       |

**Response:** `200 OK`
```json
[
  { "id": "uuid", "image_url": "string", "answer": "STRING", "level": "medium" }
]
```

#### `POST /api/pictogram`
Create a pictogram question.

**Request Body:**
| Field       | Type   | Required |
|-------------|--------|----------|
| `image_url` | string | ✅       |
| `answer`    | string | ✅       |
| `level`     | string | ✅       |

**Response:** `201 Created`.

#### `PUT /api/pictogram/:id`
Update a pictogram question. Same body as POST.

#### `DELETE /api/pictogram/:id`
Delete a pictogram question.

**Response:** `200 OK` — `{ "ok": true }`.

---

### Proverbs (Ca dao tục ngữ)

#### `GET /api/proverbs/play`
Get randomized proverbs for gameplay.

**Query Params:**
| Param   | Type   | Required | Default |
|---------|--------|----------|---------|
| `level` | string | ❌       |         |
| `limit` | number | ❌       | 5       |

**Response:** `200 OK`
```json
[
  { "id": "uuid", "content": "string", "level": "string" }
]
```

#### `GET /api/proverbs`
Get a list of all proverbs.

**Response:** `200 OK`
```json
[
  { "id": "uuid", "content": "string", "level": "easy | medium | hard | extreme", "created_by": "uuid", "created_at": "timestamp" }
]
```

#### `POST /api/proverbs` *(Admin only)*
Create a single proverb.

**Request Body:**
| Field     | Type   | Required | Default |
|-----------|--------|----------|---------|
| `content` | string | ✅       |         |
| `level`   | string | ❌       | "easy"  |

**Response:** `201 Created`

#### `POST /api/proverbs/bulk` *(Admin only)*
Create multiple proverbs at once. The content is plain text separated by line breaks.

**Request Body:**
| Field     | Type   | Required | Default |
|-----------|--------|----------|---------|
| `content` | string | ✅       |         |
| `level`   | string | ❌       | "easy"  |

**Response:** `201 Created`

#### `PUT /api/proverbs/:id` *(Admin only)*
Update a proverb. Same body as POST.

#### `DELETE /api/proverbs/:id` *(Admin only)*
Delete a proverb.

**Response:** `204 No Content`.

---

### Nhanh Như Chớp (Fast Response)

#### `GET /api/nhanhnhuchop/questions` *(Admin only)*
List all questions for management with pagination and search.

**Query Params:**
| Param        | Type   | Required | Default | Description        |
|--------------|--------|----------|---------|--------------------|
| `page`       | number | ❌       | 1       |                    |
| `limit`      | number | ❌       | 30      |                    |
| `searchTerm` | string | ❌       |         | Search by question |
| `level`      | string | ❌       |         | Filter by level    |

**Response:** `200 OK`
```json
{
  "questions": [...],
  "total": 100,
  "totalPages": 4,
  "page": 1,
  "limit": 30
}
```

#### `GET /api/nhanhnhuchop/play`
Get randomized questions for gameplay.

**Query Params:**
| Param   | Type   | Required | Default |
|---------|--------|----------|---------|
| `level` | string | ❌       | medium  |
| `limit` | number | ❌       | 10      |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "string | null",
    "level": "easy | medium | hard"
  }
]
```

#### `POST /api/nhanhnhuchop/questions` *(Admin only)*
Create a new question.

**Request Body:**
| Field           | Type     | Required |
|-----------------|----------|----------|
| `question`      | string   | ✅       |
| `options`       | string[] | ✅       |
| `correct_index` | number   | ✅       |
| `explanation`   | string   | ❌       |
| `level`         | string   | ✅       |

#### `PUT /api/nhanhnhuchop/questions/:id` *(Admin only)*
Update an existing question. Same body as POST.

#### `DELETE /api/nhanhnhuchop/questions/:id` *(Admin only)*
Delete a question.

#### `POST /api/nhanhnhuchop/import` *(Admin only)*
Bulk import questions.

**Request Body:**
```json
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "string",
      "level": "easy"
    }
  ]
}
```

**Response:** `201 Created` — `{ "imported": number }`.

---

## 👑 Vua Tiếng Việt

### `GET /api/vuatiengviet`
List all questions for management with pagination and level filtering.

**Query Params:**
| Param   | Type   | Required | Default |
|---------|--------|----------|---------|
| `page`  | number | ❌       | 1       |
| `limit` | number | ❌       | 30      |
| `level` | string | ❌       |         |

**Response:** `200 OK`
```json
{
  "data": [...],
  "total": 500,
  "page": 1,
  "limit": 30,
  "totalPages": 17,
  "stats": {
    "total": 500,
    "easy": 100,
    "medium": 200,
    "hard": 150,
    "extreme": 50
  }
}
```

### `GET /api/vuatiengviet/play`
Get randomized questions for gameplay.

**Query Params:**
| Param   | Type   | Required | Default |
|---------|--------|----------|---------|
| `level` | string | ❌       | medium  |
| `limit` | number | ❌       | 5       |

**Response:** `200 OK` — Array of questions.

### `POST /api/vuatiengviet` *(Admin only)*
Create a new question.

**Request Body:**
| Field      | Type   | Required | Default  |
|------------|--------|----------|----------|
| `question` | string | ✅       |          |
| `answer`   | string | ✅       |          |
| `hint`     | string | ❌       |          |
| `level`    | string | ❌       | "medium" |

### `POST /api/vuatiengviet/bulk` *(Admin only)*
Bulk create questions. Same body structure as Nhanh Như Chớp import.

### `PUT /api/vuatiengviet/:id` *(Admin only)*
Update a question.

### `DELETE /api/vuatiengviet/:id` *(Admin only)*
Delete a question.

---

## 🧒 Learning with Kids (Học cùng bé)

### `GET /api/learning/categories`
List all categories with item counts.

### `GET /api/learning/categories/:id`
Get a single category.

### `POST /api/learning/categories` *(Admin only)*
Create a category.

**Request Body:**
| Field              | Type   | Required |
|--------------------|--------|----------|
| `name`             | string | ✅       |
| `description`      | string | ❌       |
| `general_question` | string | ✅       |

### `PUT /api/learning/categories/:id` *(Admin only)*
Update a category.

### `DELETE /api/learning/categories/:id` *(Admin only)*
Delete a category.

### `GET /api/learning/categories/:categoryId/questions`
List all questions in a category.

### `POST /api/learning/questions` *(Admin only)*
Create a new image-based question.

**Request Body:**
| Field         | Type   | Required |
|---------------|--------|----------|
| `category_id` | UUID   | ✅       |
| `image_url`   | string | ✅       |
| `answer`      | string | ✅       |

### `PUT /api/learning/questions/:id` *(Admin only)*
Update a question.

### `DELETE /api/learning/questions/:id` *(Admin only)*
Delete a question.

---

## ✉️ Contact

### `POST /api/contact`
Submit the contact form. Forces a `sendMail` to the configured `EMAIL_USER`.

**Request Body:**
| Field     | Type   | Required |
|-----------|--------|----------|
| `name`    | string | ✅       |
| `email`   | string | ✅       |
| `phone`   | string | ✅       |
| `message` | string | ❌       |

**Response:** `200 OK`
```json
{ "success": true, "message": "Đã gửi thành công!" }
```

**Errors:**
| HTTP | Điều kiện | Message | Message VN |
|------|-----------|---------|---------|
| `400` | Thiếu `name`, `email` hoặc `phone` | `"Vui lòng cung cấp đầy đủ thông tin bắt buộc."` | Vui lòng điền đầy đủ thông tin bắt buộc |
| `500` | Chưa cấu hình `EMAIL_USER` | `"Hệ thống chưa cấu hình email nhận."` | Hệ thống chưa cấu hình email, vui lòng liên hệ quản trị viên |
| `500` | Gửi mail thất bại | `"Lỗi gửi mail."` | Gửi email thất bại, vui lòng thử lại sau |
| `500` | Lỗi server | `"Lỗi server."` | Lỗi máy chủ, vui lòng thử lại sau |

---

## 🗓️ Schedule & Personal Management

All endpoints in this section require standard authentication (`x-api-key`, `x-user-id`, `x-session-token`). Data is strictly isolated per user.

### Timetable

#### `GET /api/timetable`
List all timetable groups and their entries for the current user.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Lịch học chính",
    "sort_order": 0,
    "entries": [
      {
        "id": "uuid",
        "day": "Thứ 2",
        "subject": "Toán học",
        "start_time": "08:00",
        "end_time": "09:30",
        "room": "A101",
        "color": "bg-blue-500/15..."
      }
    ]
  }
]
```

#### `POST /api/timetable/groups`
Create a new timetable group.

**Request Body:** `{ "name": "string" }`

#### `PUT /api/timetable/groups/:id`
Update a group's name or sort order.

#### `DELETE /api/timetable/groups/:id`
Delete a group and all its entries (cascading).

#### `POST /api/timetable/entries`
Create a new entry in a group.

**Request Body:**
| Field        | Type   | Required |
|--------------|--------|----------|
| `group_id`   | UUID   | ✅       |
| `day`        | string | ✅       |
| `subject`    | string | ✅       |
| `start_time` | string | ✅       |
| `end_time`   | string | ✅       |
| `room`       | string | ❌       |
| `color`      | string | ❌       |

#### `PUT /api/timetable/entries/:id`
Update an entry. Same body as POST (all fields optional).

#### `DELETE /api/timetable/entries/:id`
Delete an entry.

---

### Tasks

#### `GET /api/tasks`
List all tasks for the current user.

#### `POST /api/tasks`
Create a new task.

**Request Body:**
| Field         | Type    | Required | Default  |
|---------------|---------|----------|----------|
| `title`       | string  | ✅       |          |
| `description` | string  | ❌       |          |
| `due_date`    | string  | ❌       |          |
| `completed`   | boolean | ❌       | `false`  |
| `priority`    | string  | ❌       | `medium` |

#### `PUT /api/tasks/:id`
Update a task.

#### `DELETE /api/tasks/:id`
Delete a task.

---

### Notes

#### `GET /api/notes`
List all notes for the current user.

#### `POST /api/notes`
Create a new note.

**Request Body:** `{ "title": "string", "content": "string", "color": "string" }`

#### `PUT /api/notes/:id`
Update a note.

#### `DELETE /api/notes/:id`
Delete a note.

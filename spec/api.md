# Smart Learn — API Specification

> Base URL: `/api`

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
Sends a welcome email upon success. Sets `plan` to "Miễn phí", `plan_start_date` to `NOW()`, and `plan_end_date` to `NOW() + 6 days`.
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

**Errors:** `400` (missing fields / duplicate username or email), `500`.

---

### `POST /api/login`
Authenticate a user and start a session.

**Request Body:**
| Field      | Type   | Required |
|------------|--------|----------|
| `username` | string | ✅       |
| `password` | string | ✅       |

**Response:** `200 OK` — Same structure as register response (includes `sessionToken`, `refreshToken`, and `accessTokenExpiresAt`).

**Errors**: `400` (missing credentials), `401` (invalid credentials), `403` (account locked), `500`.

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

**Errors**: `401` (invalid or expired refresh token), `400` (missing fields), `500`.

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

**Errors**: `401 Unauthorized`.

---

## 📁 File Upload

### `POST /api/upload`
Upload a single file (generic).

**Request:** `multipart/form-data` with field `file`.

**Response:** `200 OK`
```json
{ "url": "/uploads/filename.ext" }
```

---

## 🩺 Health Check

### `GET /api/health`
**Response:** `200 OK`
```json
{ "ok": true }
```

---

## 👥 User Management

### `GET /api/statistics/users`
Get aggregated statistics of all users, including their activity metrics (lesson, flashcard, and quiz counts) and last login time. (Admin use)

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

---

### `POST /api/users`
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

---

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

---

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

---

### `DELETE /api/users/:id`
Delete a user account. Cannot delete the root admin (`adminsmart`).

**Response:** `204 No Content`.

**Errors:** `403` (root admin protection), `500`.

---

### `POST /api/forgot-password`
Generates a random 8-character password, updates it in the database, and sends it to the user's email.

**Request Body:**
| Field   | Type   | Required |
|---------|--------|----------|
| `email` | string | ✅       |

**Response:** `200 OK`
```json
{ "message": "Mật khẩu mới đã được gửi vào Email..." }
```

**Errors:** `404` (email not found), `500`.

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

---

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

---

### `GET /api/subjects/:id`
Get a single subject with its curriculum count.

**Response:** `200 OK` — Single subject object.

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

---

### `PUT /api/subjects/:id` *(Admin only)*
Update a subject.

**Request Body:** Same as POST (except `created_by`).

**Response:** `200 OK` — Updated subject.

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

**Errors:** `400` (thiếu `subject_ids`), `500`.

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

---

### `GET /api/curricula/:id`
Get a single curriculum with author metadata.

**Response:** `200 OK` — Single curriculum object.

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

---

### `POST /api/curricula/reorder` *(Auth required)*
Reorder curricula within a subject.

**Request Body:**
```json
{ "order": ["uuid-1", "uuid-2", "uuid-3"] }
```

**Response:** `200 OK` — `{ "success": true }`.

---

### `DELETE /api/curricula/:id` *(Owner or Admin)*
Delete a curriculum.

**Response:** `204 No Content`.

---

## 📝 Lessons

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

---

### `GET /api/lessons/:id`
Get a single lesson with quiz/flashcard data.

---

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

---

### `PUT /api/lessons/:id`
Update a lesson.

**Request Body:** Same as POST (without `curriculum_id`).

---

### `DELETE /api/lessons/:id`
Delete a lesson.

**Response:** `204 No Content`.

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

---

### `POST /api/lessons/:id/images`
Upload up to 20 images for a lesson.

**Request:** `multipart/form-data`, field name `images`.

**Response:** `201 Created` — Array of inserted image records.

---

### `DELETE /api/lessons/:id/images/:imageId`
Delete a single lesson image (also removes the file from disk).

**Response:** `204 No Content`.

---

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

---

### `PUT /api/progress/:lessonId`
Toggle lesson completion for a student.

**Request Body:**
| Field        | Type    | Required |
|--------------|---------|----------|
| `student_id` | string  | ✅       |
| `completed`  | boolean | ✅       |

**Response:** `200 OK` — Updated progress record.

---

## 🗂️ Quizlet (Flashcard Sets)

### `GET /api/quizlets`
List all visible flashcard sets. Admin sees all; users see their own + public.

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

---

### `PUT /api/quizlets/:id`
Update a set and replace all terms (transactional, permission-checked).

**Request Body:** Same as POST.

**Response:** `200 OK`.

---

### `DELETE /api/quizlets/:id`
Delete a set and all its terms (permission-checked).

**Response:** `204 No Content`.

---

## 📝 Exams (Trắc nghiệm)

### `GET /api/exams`
List all exams visible to the user. Includes `question_count` and `average_score`.

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

---

### `PUT /api/exams/:id`
Update an exam, replacing all questions (transactional, permission-checked).

**Request Body:** Same as POST.

---

### `DELETE /api/exams/:id`
Delete an exam (permission-checked).

**Response:** `204 No Content`.

---

### `POST /api/exams/:id/results`
Save a student's exam attempt.

**Request Body:**
| Field       | Type   | Required |
|-------------|--------|----------|
| `score`     | number | ✅       |
| `timeTaken` | number | ✅       |

**Response:** `201 Created` — `{ "id": "uuid" }`.

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
  { "id": "uuid", "content": "string", "level": 1, "created_by": "uuid", "created_at": "timestamp" }
]
```

#### `POST /api/proverbs` *(Admin only)*
Create a single proverb.

**Request Body:**
| Field     | Type   | Required | Default |
|-----------|--------|----------|---------|
| `content` | string | ✅       |         |
| `level`   | number | ❌       | 1       |

**Response:** `201 Created`

#### `POST /api/proverbs/bulk` *(Admin only)*
Create multiple proverbs at once. The content is plain text separated by line breaks.

**Request Body:**
| Field     | Type   | Required | Default |
|-----------|--------|----------|---------|
| `content` | string | ✅       |         |
| `level`   | number | ❌       | 1       |

**Response:** `201 Created`

#### `PUT /api/proverbs/:id` *(Admin only)*
Update a proverb. Same body as POST.

#### `DELETE /api/proverbs/:id` *(Admin only)*
Delete a proverb.

**Response:** `204 No Content`.

---

### Nhanh Như Chớp (Fast Response)

#### `GET /api/nhanhnhuchop/questions` *(Admin only)*
List all questions for management.

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
List all questions for management.

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
{ "success": true, "message": "..." }
```

**Errors:** `400` (missing required fields), `500` (email configuration error or SMTP fail).

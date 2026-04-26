# Change Log Specification

Tài liệu này ghi lại các thay đổi quan trọng trong hệ thống Smart Learn liên quan đến tính năng Cá nhân hóa môn học và Tối ưu hóa SEO.

## 1. Tính năng Cá nhân hóa môn học (Personalized Subjects)

**Date:** 2026-04-17

### Task Content
Người dùng có thể tự thiết định danh sách môn học hiển thị trên sổ tay và trang chủ thay vì hiển thị toàn bộ môn học từ hệ thống.

### Checklist
- [x] Tạo bảng `user_subjects` trong cơ sở dữ liệu.
- [x] Triển khai API `GET /api/user-subjects` để lấy danh sách môn học đã chọn.
- [x] Triển khai API `POST /api/user-subjects` để cập nhật danh sách môn học.
- [x] Cập nhật `SubjectsPage.tsx` với nút "Thiết định môn học".
- [x] Tạo Modal lựa chọn môn học dạng lưới 3 cột với biểu tượng và tên.
- [x] Đồng bộ hóa hiển thị môn học trên Trang chủ (`Index.tsx`) theo lựa chọn của người dùng.
- [x] Xử lý trạng thái trống (Empty state) kèm hướng dẫn thiết định.

### Nội dung thay đổi
- **Database**: Thêm bảng `user_subjects` (user_id, subject_id).
- **Backend**: Thêm logic migration tự động và 2 endpoint mới. Sửa lỗi Middleware chặn truy cập trực tiếp vào `/login`.
- **Frontend**:
    - `SubjectsPage.tsx`: Thêm Dialog quản lý môn học, đổi layout lựa chọn sang grid-cols-3, thêm text hướng dẫn "Chọn môn học đưa vào sổ tay".
    - `Index.tsx`: Fetch dữ liệu từ `/api/user-subjects` nếu đã đăng nhập.
    - `subjectStorage.ts`: Bổ sung thêm các biểu tượng mới (Địa lý, Hóa học, Lịch sử, Tiếng Anh).

---

## 2. Tối ưu hóa SEO & Cấu hình Domain

**Date:** 2026-04-17

### Task Content
Cấu hình SEO cơ bản và cập nhật toàn bộ đường dẫn website sang tên miền chính thức.

### Checklist
- [x] Cập nhật Meta tags (Title, Description, Keywords) trong `index.html`.
- [x] Cấu hình `public/robots.txt` hướng dẫn Bot và chặn các path nhạy cảm.
- [x] Tạo file `public/sitemap.xml` tự động chứa các đường dẫn public.
- [x] Cập nhật toàn bộ URL từ `smart-learn.up.railway.app` sang `http://smartlearnapp.net/`.

### Nội dung thay đổi
- **SEO**: Thêm từ khóa "Smart learn, Nền tảng học thông minh".
- **Robots.txt**: Thêm Disallow cho `/api/`, `/admin/`, `/uploads/`. Khai báo Sitemap.
- **Sitemap.xml**: Liệt kê các trang chính với priority phù hợp.
- **URL**: Thay thế đồng loạt các cấu hình URL cũ sang tên miền mới.

---

## 3. Sửa lỗi hệ thống

**Date:** 2026-04-18

### Task Content
Khắc phục lỗi không thể truy cập trực tiếp các trang (deep-linking) do Middleware xác thực.

### Checklist
- [x] Phân tách xác thực cho API và các trang Frontend tĩnh.

### Nội dung thay đổi
- **Server**: Cập nhật `server/index.mjs` để Middleware chỉ kiểm tra Token đối với các request bắt đầu bằng `/api/`, cho phép tải giao diện React trực tiếp.

---

## 4. Tích hợp Rich Text Editor

**Date:** 2026-04-18

### Task Content
Thay thế input nhập liệu đơn giản bằng Rich Text Editor cho nội dung bài học tại phần quản lý khóa học và giáo viên. Hỗ trợ nhập liệu nhiều dòng, tùy chỉnh hiển thị (font chữ, kích thước, màu sắc, in đậm/nghiêng) và upload ảnh/media.

### Checklist
- [x] Tạo component `RichTextEditor.tsx`.
- [x] Tích hợp component vào quản lý khóa học và giáo viên.
- [x] Đảm bảo hiển thị đúng nội dung định dạng (Rich text) khi học viên xem bài học.
- [x] Xử lý lỗi UI và đảm bảo duy trì trạng thái focus khi tương tác với công cụ.
- [x] Tích hợp khả năng tải lên hình ảnh cho nội dung bài học.

### Nội dung thay đổi
- **Frontend**: Bổ sung `RichTextEditor`, cập nhật form nhập liệu bài học. Xử lý render an toàn cho nội dung HTML trả về từ nội dung bài học.

---

## 5. Cập nhật tài liệu và Sửa lỗi

**Date:** 2026-04-18

### Task Content
Khắc phục các lỗi phát sinh (authentication lỗi JSON, missing component, API Not Found) và đồng bộ hóa tài liệu hệ thống.

### Checklist
- [x] Khắc phục Login JSON Error (lỗi server trả về HTML báo lỗi thay vì JSON).
- [x] Khắc phục Reference Error `VuaTiengVietSelectModal is not defined` trong `GameGrid.tsx`.
- [x] Khắc phục API Not Found cho Form Liên hệ (`/api/contact`).
- [x] Bổ sung tài liệu API `Vua Tiếng Việt` vào thư mục đặc tả API (`spec/api.md`).

### Nội dung thay đổi
- **Documentation**: Đồng bộ hóa file `spec/api.md`.

---

## 6. Vua Tiếng Việt & Sentence Ordering Quiz

**Date:** 2026-04-19

### Task Content
Tích hợp Game Vua Tiếng Việt vào hệ thống quản lý và thêm dạng câu hỏi Sắp xếp câu (ordering) vào hệ thống Trắc nghiệm chung.

### Checklist
- [x] Phát triển tính năng Quản lý Game Vua Tiếng Việt (Export Excel, Xóa, Thêm hàng loạt).
- [x] Thêm định dạng câu hỏi `ordering` (Sắp xếp câu) cho các bài thi trắc nghiệm (Exams).
- [x] Cập nhật giao diện `QuizFormPage`, hiển thị hướng dẫn làm bài ở `QuizTakePage`.

### Nội dung thay đổi
- **Backend**: Các endpoint Quản lý Vua Tiếng Việt và sửa lỗi Delete handler.
- **Frontend**: Nâng cấp module Trắc nghiệm và Quản lý Vua Tiếng Việt.

---

## 7. Admin Account Management Redesign

**Date:** 2026-04-20

### Task Content
Nâng cấp giao diện Quản lý Tài khoản sang dạng Table View, bổ sung các trường thông tin như Education Level, Plan, Expiration, Status.

### Checklist
- [x] Cập nhật CSDL model `users` thêm `education_level`, `plan`, `plan_start_date`, `plan_end_date`, `is_active`.
- [x] Cập nhật API `GET /api/users` hỗ trợ Pagination, phân trang và Filter.
- [x] Thiết kế UI quản lý User kiểu Table, bỏ dạng Card.

### Nội dung thay đổi
- **Database**: Add user metadata columns.
- **Backend**: Update API User list trả về `total`, `page`, và `stats`.

---

## 8. Admin Statistics Dashboard

**Date:** 2026-04-24

### Task Content
Cung cấp màn hình Thống kê để Admin theo dõi số lượng bài học, flashcard, quiz đã tạo và lịch sử đăng nhập của học viên.

### Checklist
- [x] Ghi nhận `last_login` vào CSDL mỗi khi người dùng đăng nhập.
- [x] Phát triển API `GET /api/statistics/users` tập hợp số liệu lesson_count, flashcard_count, quiz_count.
- [x] Cập nhật Navigation thêm menu Thống kê.

### Nội dung thay đổi
- **Backend**: Thêm endpoint `GET /api/statistics/users`. Thêm trường `last_login` cho bảng `users`.

---

## 9. Hệ thống & Tài liệu (System & Documentation)

**Date:** 2026-04-25

### Task Content
Dọn dẹp hệ thống log và đồng bộ hóa toàn bộ tài liệu đặc tả API để phục vụ việc phát triển và bàn giao.

### Checklist
- [x] Loại bỏ toàn bộ log debug cơ sở dữ liệu `[DB Debug]` trong `server/db.mjs`.
- [x] Cập nhật và bổ sung đầy đủ các endpoint mới vào `spec/api.md`.
- [x] Khởi tạo thư mục `/docs` và đồng bộ hóa tài liệu hệ thống.
- [x] Khắc phục lỗi `TypeError` liên quan đến `charAt` khi xử lý dữ liệu người dùng (UI fix).

### Nội dung thay đổi
- **Backend**: Gỡ bỏ `console.log` gây nhiễu trong module Database.
- **Documentation**: Cập nhật `spec/api.md` (Table of Contents, snake_case consistency, Admin stats). Sao chép tài liệu sang `/docs`.
- **Frontend**: Thêm kiểm tra null-safe cho các thuộc tính chuỗi trong các component hiển thị thông tin người dùng.

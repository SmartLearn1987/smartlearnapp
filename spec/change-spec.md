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
- **Backend / Routing**: Cấu hình route trả đúng chuẩn JSON khi lỗi diễn ra, cập nhật đăng ký endpoint `/api/contact` thành công ở `server/index.mjs`.
- **Frontend**: Fix lỗi import component cho `VuaTiengVietSelectModal`.
- **Documentation**: Đồng bộ hóa file `spec/api.md`.

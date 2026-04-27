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

---

## 10. Quản lý Gói cước & Quyền truy cập (Premium Plans & Access Control)

**Date:** 2026-04-26

### Task Content
Bổ sung tính năng quản lý danh mục gói cước, đánh dấu gói cước "Premium", tự động tính toán ngày hết hạn dựa trên chu kỳ đăng ký và kiểm soát chặt chẽ quyền truy cập tính năng.

### Checklist
- [x] Thêm thuộc tính `is_premium` cho các gói cước (`plans`) trong Database và API.
- [x] Tính năng "Vô thời hạn" tự động cộng 1800 ngày vào thời hạn (plan_end_date).
- [x] Cập nhật giao diện Quản lý Gói cước (Admin) để thiết lập và hiển thị trạng thái Premium.
- [x] Đồng bộ hóa hiển thị trên giao diện Nâng cấp Gói cước public để ưu tiên các gói Premium.
- [x] Thực thi Subscription Expiration Access Control: Kiểm tra `planEndDate` trên toàn hệ thống (Sổ tay môn học, Làm bài trắc nghiệm).
- [x] Thiết kế Popup cảnh báo "Hết hạn gói cước" thống nhất, tự động chặn người dùng và điều hướng đến trang nâng cấp.
- [x] Khắc phục lỗi hiển thị và trải nghiệm (UX) trên giao diện Tạo bài thi và Học phần Flashcard.

### Nội dung thay đổi
- **Database**: Bổ sung `is_premium` vào bảng `plans`.
- **Backend**: Cập nhật logic tính toán `plan_end_date`. Mở rộng các API liên quan đến `plans`.
- **Frontend**: 
    - Tích hợp logic kiểm tra hạn sử dụng tại trang chủ và danh sách trắc nghiệm.
    - Cải thiện UI `QuizFormPage.tsx` và `CreateQuizletPage.tsx` giúp người dùng dễ dàng thao tác.
- **Documentation**: Cập nhật `spec/api.md` bổ sung đặc tả API Plans Management.

---

## 11. Đồng bộ giao diện & Tối ưu hóa trải nghiệm (UI Consistency & UX Optimization)

**Date:** 2026-04-27

### Task Content
Nâng cấp tính nhất quán của giao diện người dùng trên toàn hệ thống, chuẩn hóa các thành phần điều hướng và hành động, đồng thời khắc phục các lỗi logic quan trọng trong module Thời gian biểu và Flashcard.

### Checklist
- [x] Phân tách logic Hiển thị (View) và Chỉnh sửa (Edit) cho học phần Flashcard dựa trên Route.
- [x] Chuẩn hóa toàn bộ nút "Hủy" (Cancel) sang màu đỏ (viền đỏ, chữ đỏ) trên tất cả các Modal, Popup và Form trong hệ thống (Hơn 20 file được cập nhật).
- [x] Nâng cấp giao diện nút "Thêm câu hỏi mới" trong module Trắc nghiệm (Emerald style, pill-shaped).
- [x] Khắc phục lỗi mất chức năng Sửa (Edit) trong tab Thời khóa biểu của trang Thời gian biểu.
- [x] Cập nhật bảng mã màu chuẩn cho các ngày trong tuần (Thứ 2 - Chủ nhật) và logic phân tách tiết học Sáng/Chiều.
- [x] Đồng bộ hóa tài liệu đặc tả thiết kế chi tiết cho module Thời gian biểu (`spec/schedule/DetailDesign_schedule.md`).

### Nội dung thay đổi
- **Frontend**:
    - **Global UI**: Cập nhật đồng loạt các nút "Hủy" tại: `AdminPage`, `TeacherPage`, `ProfilePage`, `SubjectsPage`, `CoursesPage`, `GameGrid`, `SchedulePage`, `QuizletPages`, và các trang quản lý Game (`NhanhNhuChop`, `Pictogram`, `VuaTiengViet`, `Dictation`, `Proverb`).
    - `EditQuizletPage.tsx`: Thêm kiểm tra `isEditPage` để ẩn/hiện form chỉnh sửa.
    - `QuizFormPage.tsx`: Thay đổi style nút Add Question từ dashed border sang solid emerald pill.
    - `SchedulePage.tsx`: Bổ sung hàm `openEdit` bị thiếu, cập nhật hằng số `DAY_COLORS` và sửa lỗi UI cho các Tab.
- **Documentation**: 
    - Cập nhật `spec/schedule/DetailDesign_schedule.md` với các quy chuẩn UI mới và mã màu ngày trong tuần.
    - Sửa lỗi đánh số mục lục (Section 5-8) trong tài liệu đặc tả Schedule.

# Smart Learn — Quizlet Screens (Figma Mockup)

Tài liệu này tổng hợp các mockup giao diện cho nhóm chức năng **Flashcard (Quizlet)** của ứng dụng Smart Learn.

---

## 1. Màn hình Danh sách Học phần (QuizletListPage)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Heading | "Kho Flashcard" — text-3xl bold |
| 2 | Subtitle | "Khám phá và ôn luyện với hàng ngàn bộ thẻ ghi nhớ" |
| 3 | Search Bar | Icon Search + input "Tìm kiếm bộ flashcard...", rounded-xl |
| 4 | View Toggle | Pill toggle 2 tab: **Cá nhân** / **Cộng đồng** |
| 5 | Create Button | "+ Tạo bài mới" — rounded-full (chỉ hiện ở tab Cá nhân) |
| 6 | Level Header | Icon Layers + Tên cấp học (VD: "Tiểu học") |
| 7 | Subject Group | Tên môn học + Số học phần |
| 8 | Quizlet Card | Thông tin Title, số thẻ (Terms), tác giả, tùy chọn Edit/Delete |

---

## 2. Màn hình Tạo/Sửa Học phần (Create/Edit QuizletPage)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Back + Heading | Arrow ← + "Tạo một học phần mới" (hoặc "Chỉnh sửa học phần") |
| 2 | Metadata Grid | Tiêu đề, Môn học (Select), Cấp độ (Select), Lớp, Chế độ hiển thị (Công khai/Không công khai) |
| 3 | Description | Textarea "Thêm mô tả (không bắt buộc)..." |
| 4 | Import Button | Nút "Nhập danh sách" (Import icon) |
| 5 | Term Card | Số thứ tự, Input "Thuật ngữ", Input "Định nghĩa", Icon Hình ảnh, Nút xóa/kéo thả |
| 6 | Add Card Button | "+ Thêm thẻ" — outlined button |
| 7 | Save Button | "Tạo và ôn luyện" (hoặc "Lưu & Ôn luyện") |

---

## 3. Màn hình Cài đặt & Tùy chỉnh (Settings)

*Chức năng tùy chỉnh mặt trước và mặt sau bao gồm cài đặt màu chữ (Colors) và cỡ chữ (Font sizes).*

---

## 4. Design System — Quizlet Module

### Component Radius

| Component | Radius |
|-----------|--------|
| Quizlet Card (List) | `rounded-2xl` (16px) |
| Layout Box | `rounded-2xl` (16px) |

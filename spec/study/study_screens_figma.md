# Smart Learn — Study Screens (Figma Mockup)

Tài liệu này tổng hợp các mockup giao diện cho module **Sổ tay học tập (Study)** bao gồm quản lý môn học, giáo trình và bài học.

---

## 1. Màn hình Sổ tay môn học (SubjectsPage)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Heading | "Các môn học" — text-3xl bold |
| 2 | Subtitle | "Ghi chép, lưu trữ bài học của bạn..." |
| 3 | Settings Button | Icon Settings + "Thiết định môn học", rounded-xl |
| 4 | Subject Card | Icon môn học (Emoji/SVG), Tên môn, Số giáo trình (VD: "2 giáo trình") |
| 5 | Settings Modal | Grid 3-col các môn học có Checkbox. Nút "Lưu thay đổi" & "Hủy" |

---

## 2. Màn hình Quản lý Giáo trình (CoursesPage - List View)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Back Button | Arrow ← "Quay lại" |
| 2 | Subject Info | Icon lớn + Title môn học + Description |
| 3 | Create Button | "+ Tạo giáo trình mới" — green, rounded-xl, shadow-lg |
| 4 | Level Section | Bullet point + Tên cấp học (VD: "Tiểu học") + Số lượng |
| 5 | Curriculum Card | Ảnh bìa (aspect-video), Tên, NXB, Badge số bài học, Nút "Quản lý bài học", "Sửa", "Xóa" |

---

## 3. Quản lý Bài học (CoursesPage - Lessons View)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Back Button | Arrow ← (Icon circle), Title giáo trình, Badge tên môn |
| 2 | Subview Toggle | Pill toggle: **Quản lý bài học** / **Ôn tập** |
| 3 | Add Lesson | "+ Tạo ghi chú mới" — outlined green (chỉ ở tab Quản lý) |
| 4 | Lesson Grid | Card: STT. Tên bài, Mô tả, Nút "Sửa", "Xóa" |
| 5 | Review Card | Card (Review mode): STT (Tròn/Vuông), Badge "Đã học" (nếu hoàn thành) |

---

## 4. Form Soạn thảo Bài học (Lesson Form)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Header | Title bài học (h3 bold), Badge giáo trình + môn |
| 2 | Input Grid | 2-col: Tên bài học, Mô tả ngắn |
| 3 | Rich Editor | Thanh công cụ (Heading, Bold, Color, Font size, List) + Content Area |
| 4 | Image Section | "Hình ảnh bài học", Button "Thêm ảnh", Grid preview (aspect-video) với nút X |
| 5 | Summary Grid | 2-col: Textarea "Tóm tắt", Textarea "Các ý chính" |
| 6 | Quiz Section | Accordion/List các câu hỏi. Nút "+ Thêm câu hỏi". Input Option A-D & Select đáp án đúng |
| 7 | Flashcard Sect | Grid 2-col: Mặt trước, Mặt sau. Nút "Nhập" & "+ Thẻ" |

---

## 5. Chế độ Ôn tập (Lesson Review Mode)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Sub-Header | Nút Back (Circle), Title bài học, Nút "Đánh dấu học" (Emerald-500 if done) |
| 2 | Tab Navigation | **Nội dung** | **Trắc nghiệm** | **Flashcard** | **Tổng kết** |
| 3 | Slide Viewer | (Tab Nội dung) Aspect-video, Nút Prev/Next overlay, Counter (n:N) |
| 4 | Summary View | (Tab Tổng kết) Section "Tóm tắt" & Section "Điểm cần nhớ" (Numbered list) |

---

## 6. Design System — Study Module

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary Green | `#2D9B63` | Buttons, Success badges, Active tabs |
| Emerald Done | `#10B981` | Completed progress |
| Background | `#F8FAFC` | Page background |

### Radius

| Component | Value |
|-----------|-------|
| Subject Card | `rounded-xl` |
| Curriculum Card | `rounded-2xl` |
| Lesson Card | `rounded-2xl` |
| Content Box | `rounded-3xl` |
| Form Input | `rounded-xl` |

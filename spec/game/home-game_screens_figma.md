# Smart Learn — Home Game Screens (Figma Mockup)

Tài liệu này tổng hợp các mockup giao diện cho hệ thống lựa chọn trò chơi tại Trang chủ.

---

## 1. Màn hình Lưới Game (Game Grid Section)

### Thành phần giao diện

| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Section Heading | "Khu Vực Trò Chơi" — text-2xl bold + Icon Gamepad |
| 2 | Game Card | Thẻ trò chơi với Background Decor (hình tròn mờ góc trên phải) |
| 3 | Thumbnail | Hình ảnh game (aspect-square), rounded-xl, shadow-sm |
| 4 | Title & Desc | Tên game (bold), mô tả ngắn (line-clamp-2) |
| 5 | Action Badge | Button "Bắt đầu" (hoặc "Cấu hình Game" cho Admin), Icon ChevronRight |

---

## 2. Modal Cấu hình (Game Select Modals)

### Cấu trúc chung (General Layout)
- **Overlay**: Background `black/40` với hiệu ứng `backdrop-blur-sm`.
- **Container**: `w-full max-w-sm` (hoặc `max-w-md`), rounded-2xl (hoặc `rounded-[2rem]`), animate `scale-in`.
- **Header**: Icon game (trên nền màu đặc trưng), Tên game, Nút X đóng modal.

### 2.1. Modal Vua Tiếng Việt / Đuổi Hình / Ca Dao
- **Level Grid**: 2 cột, 4 nút lựa chọn cấp độ (Dễ, TB, Khó, Cực khó) với màu sắc riêng.
- **Config Grid**: 2 cột, Select chọn "Số câu hỏi" & Select chọn "Thời gian".
- **Footer**: Nút "Hủy" (outline) & "Chơi ngay" (solid primary/game color).

### 2.2. Modal Chép Chính Tả
- **Level Grid**: 2 cột cấp độ.
- **Language Grid**: 3 cột chọn ngôn ngữ (Vi, En, Ja) kèm cờ quốc gia.
- **Footer**: Nút "Hủy" & "Chơi ngay".

### 2.3. Modal Học Cùng Bé
- **Header**: Title "Học cùng bé", icon BookOpen (Cyan).
- **Category List**: Danh sách cuộn dọc các chủ đề. 
    - Mỗi item: Icon LayoutGrid, Tên chủ đề, Số lượng hình ảnh (Badge uppercase black).
- **Selection State**: Item được chọn có Border Cyan, Shadow-md và Ring-4.
- **Footer**: Nút "Hủy" & "Chơi ngay" (Cyan-600).

### 2.4. Modal Nhanh Như Chớp
- **Container**: Bo góc lớn `rounded-[2rem]`, Padding dày.
- **Level Grid**: 2 cột nút đậm màu Emerald.
- **Selects**: Select "Số câu hỏi" và "Thời gian" với nền `slate-50`.
- **Footer**: Nút "Hủy" (ghost) & "Chơi ngay" (Emerald-600 shadow).

---

## 3. Design System — Game Module

### Game Color Identity

| Game | Accent Color | Token |
|------|--------------|-------|
| Đuổi hình bắt chữ | Blue | `blue-500` |
| Vua tiếng việt | Green | `green-600` |
| Chép chính tả | Purple | `purple-600` |
| Học cùng bé | Cyan | `cyan-600` |
| Ca dao tục ngữ | Amber | `amber-600` |
| Nhanh như chớp | Emerald | `emerald-600` |

### Level Colors

| Level | Border | Background | Text |
|-------|--------|------------|------|
| Easy | `green-300` | `green-50` | `green-700` |
| Medium | `blue-300` | `blue-50` | `blue-700` |
| Hard | `orange-300` | `orange-50` | `orange-700` |
| Extreme | `red-300` | `red-50` | `red-700` |

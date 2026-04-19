# Smart Learn — Auth Screens (Figma Mockup)

Tài liệu này tổng hợp các mockup giao diện cho nhóm chức năng **Xác thực (Auth)** của ứng dụng Smart Learn.

---

## 1. Màn hình Đăng nhập (Login)

![Màn hình Đăng nhập](C:\Users\USER\.gemini\antigravity\brain\501748c2-585d-4b64-af64-0003dbc7aa08\auth_login_screen_1776088238812.png)

### Thành phần giao diện:
| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Logo | Icon Library (#C08447) trên nền rounded-2xl |
| 2 | App Name | "Smart Learn" — font bold, màu #2D9B63 |
| 3 | Subtitle | "Đăng nhập để tiếp tục" — gray muted |
| 4 | Input: Username | Label "Tên đăng nhập", placeholder "Nhập tên đăng nhập", rounded-xl border |
| 5 | Input: Password | Label "Mật khẩu", placeholder "Nhập mật khẩu", có icon Eye toggle bên phải |
| 6 | Error Block | Hiển thị khi có lỗi — nền đỏ nhạt, viền đỏ |
| 7 | Button: Submit | "Đăng nhập" — full width, nền primary green |
| 8 | Link: Forgot | "Quên mật khẩu?" — chuyển sang form Khôi phục |
| 9 | Link: Register | "Chưa có tài khoản? Đăng ký ngay" |

---

## 2. Màn hình Quên mật khẩu (Forgot Password)

![Màn hình Quên mật khẩu](C:\Users\USER\.gemini\antigravity\brain\501748c2-585d-4b64-af64-0003dbc7aa08\auth_forgot_password_1776088487442.png)

### Thành phần giao diện:
| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Logo + App Name | Giống màn Đăng nhập |
| 2 | Subtitle | "Khôi phục mật khẩu" — gray muted |
| 3 | Input: Email | Label "Địa chỉ Email", placeholder "Nhập email của bạn" |
| 4 | Error Block | Hiển thị khi email không tìm thấy |
| 5 | Button: Submit | "Gửi mật khẩu mới" — full width, nền primary green |
| 6 | Link: Back | "Quay lại đăng nhập" — chuyển về form Login |
| 7 | Link: Register | "Chưa có tài khoản? Đăng ký ngay" |

---

## 3. Màn hình Đăng ký (Register)

![Màn hình Đăng ký](C:\Users\USER\.gemini\antigravity\brain\501748c2-585d-4b64-af64-0003dbc7aa08\auth_register_screen_1776088417679.png)

### Thành phần giao diện:
| # | Element | Chi tiết |
|---|---------|----------|
| 1 | Logo + App Name | Giống màn Đăng nhập |
| 2 | Subtitle | "Tạo tài khoản học tập mới" — gray muted |
| 3 | Input: Username | Icon 👤 bên trái, placeholder "Nhập tên đăng nhập" |
| 4 | Input: Email | Icon ✉️ bên trái, placeholder "name@example.com" |
| 5 | Input: Password | Icon 🔒 bên trái + Eye toggle bên phải, placeholder "Tối thiểu 6 ký tự" |
| 6 | Input: Confirm | Icon 🔒 bên trái, placeholder "Nhập lại mật khẩu" |
| 7 | Select: Education | Icon 🎓 bên trái + Chevron bên phải, options: Tiểu học, Trung học cơ sở, Trung học Phổ Thông, Đại Học / Cao Đẳng, Luyện thi chứng chỉ |
| 8 | Error Block | Hiển thị khi validation fail |
| 9 | Button: Submit | "Đăng ký tài khoản" — full width, nền primary green |
| 10 | Link: Login | "Đã có tài khoản? Đăng nhập ngay" |

---

## 4. Design System

### Color Palette
| Token | Hex | Sử dụng |
|-------|-----|---------|
| Primary Green | `#2D9B63` | Button, App name, active links |
| Warm Brown | `#C08447` | Logo icon background |
| Background | `#FFFFFF` | Page background |
| Card | `#FFFFFF` | Card background |
| Border | `#E5E7EB` | Input borders, card borders |
| Border Focus | `#2D9B63` | Input focus state |
| Destructive | `#EF4444` | Error messages |
| Muted Text | `#9CA3AF` | Placeholders, subtitles |

### Typography
| Element | Font Weight | Size |
|---------|-------------|------|
| App Name | Bold | 30px (text-3xl) |
| Subtitle | Regular | 14px (text-sm) |
| Label | Semibold | 14px (text-sm) |
| Input Text | Medium | 14px (text-sm) |
| Button Text | Bold | 14px (text-sm) |
| Link Text | Bold/Semibold | 14px/12px |

### Spacing & Radius
| Element | Value |
|---------|-------|
| Background Decoration | Hai khối tròn mờ (blur-3xl) màu primary/8 và secondary/8 |
| Card padding | 32px (p-8) |
| Card border radius | 16px (rounded-2xl) |
| Input border radius | 12px (rounded-xl) |
| Input padding | 12px vertical, 16px horizontal |
| Button height | 44px (h-11) |
| Field gap | 16px (space-y-4) |
| Logo icon size | 64×64px |

### States
| State | Behavior |
|-------|----------|
| Default | Border: 2px solid #E5E7EB |
| Focus | Border: 2px solid #2D9B63 |
| Error | Red banner below inputs |
| Loading | Spinner icon + "Đang xử lý…" text |
| Disabled | Opacity reduced, cursor not-allowed |

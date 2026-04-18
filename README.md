# Smart Learn - Nền tảng học tập thông minh

Smart Learn là một ứng dụng web hiện đại giúp quản lý giáo trình, bài học và bộ thẻ ghi nhớ (Quizlet/Trắc nghiệm), hỗ trợ cả học sinh trong việc tự học và giáo viên trong việc quản lý nội dung bài giảng một cách khoa học.

---

## 🚀 Tính năng chính

### 👨‍🎓 Đối với Học sinh
- **Sổ tay môn học**: Danh sách môn học và giáo trình trực quan, phân loại khoa học theo từng chủ đề. Phụ lục ghi chú trọng tâm giúp nắm vững kiến thức bứt phá.
- **Học tập đa phương thức**: Giao diện bài học dạng tab thông minh (Nội dung, Trắc nghiệm, Flashcard, Tổng kết).
- **Luyện tập Quizlet & Trắc nghiệm**: Bộ thẻ ghi nhớ và đề kiểm tra được đồng bộ môn học, hỗ trợ **Auto-play**, **Shuffle**, **Fullscreen** và **Tùy biến giao diện Flashcard**.
- **Cá nhân hóa nội dung Cộng đồng**: Tự động lọc các bộ thẻ ghi nhớ và bài trắc nghiệm trong mục "Cộng đồng" dựa trên **Cấp độ học tập** của người dùng, giúp tiếp cận nội dung phù hợp nhất.
- **Bảng tổng kết**: Theo dõi chuỗi hoạt động học tập hàng ngày (Streak) và các chỉ số thống kê kết quả học tập tổng quát một cách trực quan.
- **Thời khóa biểu đa nhóm**: Quản lý nhiều loại thời khóa biểu độc lập với giao diện chuyển đổi linh hoạt. Nội dung mô tả nhiệm vụ trong danh sách được hiển thị đầy đủ, giữ nguyên định dạng xuống dòng giúp ghi chú rõ ràng hơn.
- **Trò chơi học tập**: Tham gia các trò chơi tương tác như **Chép chính tả**, **Đuổi hình bắt chữ**, **Ca dao tục ngữ** và **Nhanh như chớp** (Trắc nghiệm tính giờ) để rèn luyện kỹ năng với hệ thống tính điểm thông minh và đồng hồ đếm ngược.
- **Quản lý cá nhân**: Xem và chỉnh sửa thông tin hiển thị, ảnh đại diện, trình độ giáo dục và đổi mật khẩu dễ dàng.
- **Gói hội viên**: Xem chi tiết thông tin gói cước. Tài khoản mới sẽ được tự động kích hoạt gói **Miễn phí** với thời hạn dùng thử **6 ngày** ngay khi đăng ký.
- **Thông báo Email**: Hệ thống tự động gửi email chào mừng khi đăng ký thành công và gửi mật khẩu mới khi yêu cầu khôi phục mật khẩu, kèm theo thông tin hỗ trợ chi tiết.
- **Bảo mật & Phiên làm việc**: Hệ thống bảo mật an toàn với cơ chế **Refresh Token** tự động làm mới, đảm bảo duy trì đăng nhập lâu dài (30 ngày) và trải nghiệm liền mạch cho người dùng.

### 👨‍🏫 Đối với Giáo viên & Admin
- **Quản lý tài khoản**: Khởi tạo, chỉnh sửa thông tin, đặt lại mật khẩu, quản lý **Gói cước hội viên** (Ngày bắt đầu/kết thúc) và thực hiện khóa/mở khóa tài khoản trực quan trên giao diện Admin.
- **Tối ưu hóa Mobile**: Toàn bộ các form quản trị và bảng điều khiển được thiết kế Responsive, hỗ trợ thao tác mượt mà trên Smartphone.
- **Quản lý môn học**: Tùy chỉnh danh mục, biểu tượng (hỗ trợ Emoji đa dạng) và môn học dùng chung cho toàn hệ thống.
- **Tạo tài liệu siêu tốc**: Quy trình tạo Giáo trình (hiển thị **số lượng bài học**, **người tạo**, **ngày tạo**) và Trắc nghiệm tối giản, gán môn học trực tiếp để phân loại nội dung thông minh.
- **Phân quyền nội dung**: Giáo viên chỉ xem và quản lý giáo trình do mình tạo. Admin có quyền truy cập toàn bộ hệ thống.
- **Biên tập bài học thông minh**: Tích hợp văn bản, slideshow hình ảnh, bộ câu hỏi trắc nghiệm và thẻ ghi nhớ trong cùng một trang duy nhất.
- **Quản trị Nội dung & Game**: Quản lý kho nội dung trực tiếp (**Chép chính tả**, **Đuổi hình bắt chữ**, **Ca dao tục ngữ** và **Nhanh như chớp**) với giao diện trực quan, hỗ trợ import hàng loạt, tải lên hình ảnh và gán cấp độ câu hỏi.
- **Quản lý tập trung**: Giao diện quản lý Quizlet và Trắc nghiệm chuyên nghiệp, hỗ trợ nhập liệu nhanh (Bulk Import).

### ⏱️ Công cụ hỗ trợ
- **Pomodoro Timer**: Đồng hồ đếm ngược với hiệu ứng Glassmorphism và thông báo âm thanh Digital Chime giúp tăng cường sự tập trung khi học.
34: - **Liên hệ & Phản hồi**: Trang liên hệ chuyên nghiệp tích hợp hệ thống gửi email tự động tới Ban quản trị, giúp người dùng dễ dàng đóng góp ý kiến xây dựng hệ thống.

---

## 🛠 Công nghệ sử dụng

### Frontend
- **React 18** (Vite)
- **TypeScript**
- **Tailwind CSS** & **Shadcn/UI** (Giao diện hiện đại, responsive, premium aesthetics)
- **Lucide React** (Bộ icon tinh tế)
- **React Query** (Quản lý state server hiệu quả)

### Backend
- **Node.js** (Express)
- **PostgreSQL** (Hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ)
- **Multer** (Xử lý upload hình ảnh cho slideshow bài học)
- **Automated Migrations**: Tự động đồng bộ cấu trúc bảng khi khởi động server.
- **Email Service (Nodemailer)**: Tích hợp hệ thống gửi email tự động (Nền tảng Gmail) cho quy trình xác nhận đăng ký và khôi phục mật khẩu.

---

## 🛠 Hướng dẫn cài đặt (Local)

### 1. Yêu cầu hệ thống
- Node.js >= 18.0.0
- PostgreSQL đang chạy trên máy local.

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Cấu hình môi trường (.env)
Tạo file `.env` tại thư mục gốc và cấu hình các thông số kết nối Database tương ứng.

### 4. Khởi chạy ứng dụng
**Backend:** `npm run dev:server`  |  **Frontend:** `npm run dev`
Truy cập: `http://localhost:8080`

---

## 📦 Triển khai (Deployment)
Dự án được tối ưu hóa để triển khai trên **Railway** với tệp cấu hình `railway.toml` có sẵn.

---

## 📁 Cấu trúc thư mục
- `/src`: Mã nguồn Frontend (Pages, Components, Contexts).
- `/server`: Mã nguồn Backend (API Routes, Database logic).
- `/uploads`: Thư mục lưu trữ hình ảnh bài học.
- `/spec`: Tài liệu đặc tả và hướng dẫn sử dụng chi tiết các tính năng.
- `/spec/api.md`: Tài liệu đặc tả API đầy đủ (Request/Response) cho toàn bộ hệ thống.

---

## 📄 Giấy phép
Dự án được phát triển phục vụ mục đích giáo dục và học tập.
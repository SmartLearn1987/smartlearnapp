# Hướng dẫn Deploy lên Railway.app

Ứng dụng của bạn đã được cấu hình để chạy ở chế độ Production (Backend phục vụ trực tiếp Frontend). Dưới đây là các bước để đưa ứng dụng lên internet qua Railway.

## 1. Chuẩn bị Code
Đảm bảo bạn đã đẩy code mới nhất lên một Repository trên **GitHub** (hoặc GitLab).

## 2. Tạo Project trên Railway
1. Truy cập [Railway.app](https://railway.app/) và đăng nhập.
2. Nhấn **New Project** -> **Deploy from GitHub repo**.
3. Chọn Repository chứa code của bạn.

## 3. Thêm Cơ sở dữ liệu (PostgreSQL)
1. Trong giao diện Project của Railway, nhấn **Add Service** (hoặc nút `+`).
2. Chọn **Database** -> **Add PostgreSQL**.
3. Railway sẽ tự động tạo một Database.

## 4. Cấu hình Biến môi trường (Environment Variables)
1. Nhấn vào Service chứa code ứng dụng của bạn.
2. Chuyển sang tab **Variables**.
3. Công cụ đã update Backend để tự động nhận diện `DATABASE_URL` từ Railway. Bạn chỉ cần đảm bảo biến này tồn tại trong tab Variables.
   > [!TIP]
   > Biến `DATABASE_URL` sẽ được Railway tự cung cấp khi bạn thêm dịch vụ PostgreSQL vào cùng một project.

### Cấu hình Gửi Email (Nodemailer)
Hệ thống sử dụng Gmail để gửi email (ví dụ: Khôi phục mật khẩu). Bạn cần thiết lập trong phần **Variables** của code ứng dụng trên Railway:
1. `EMAIL_USER`: Địa chỉ Gmail của bạn (vd: `nguyenvana@gmail.com`).
2. `EMAIL_PASS`: **Mật khẩu ứng dụng (App Password)** của Gmail. Tuyệt đối **không** dùng mật khẩu đăng nhập thông thường.

> [!WARNING]
> **Cách tạo Mật khẩu ứng dụng (App Password) trên Gmail:**
> 1. Truy cập [Tài khoản Google](https://myaccount.google.com/).
> 2. Bật **Xác minh 2 bước (2-Step Verification)** trong mục **Bảo mật**.
> 3. Tìm kiếm "Mật khẩu ứng dụng" hoặc "App passwords" trong thanh tìm kiếm của cài đặt Bảo mật.
> 4. Tạo một mật khẩu ứng dụng mới (đặt tên là "Railway SmartLearn") và dán mã gồm 16 chữ cái vào biến `EMAIL_PASS` trên Railway.
> 5. (Lưu ý) Mã nguồn đã được cấu hình ép dùng IPv4 (`localAddress: "0.0.0.0"`) và SSL, nên lỗi `ENETUNREACH` IPv6 khi deploy lên Railway sẽ không còn xuất hiện.

## 5. Cấu hình Build & Start
Railway sẽ đọc file `package.json` và tự động thực hiện:
- **Build Command**: `npm run build` (để tạo thư mục `/dist`).
- **Start Command**: `npm start` (chạy lệnh `node server/index.mjs`).

> [!IMPORTANT]
> **Khởi tạo cơ sở dữ liệu**:
> Code đã được thiết lập để tự động chạy file `server/schema.sql` mỗi khi server khởi động. Khi deploy lần đầu, các bảng dữ liệu sẽ tự động được tạo.

## 6. Kiểm tra kết quả
- Sau khi quá trình Deploy hoàn tất, Railway sẽ cung cấp cho bạn một **Domain** (ví dụ: `your-app.up.railway.app`).
- Truy cập vào domain đó để sử dụng ứng dụng.

---

### Lưu ý quan trọng:
- Hình ảnh bạn upload được lưu vào thư mục `/uploads` trên server. 
- **Cảnh báo**: Trên Railway, các file upload trực tiếp vào ổ đĩa server có thể bị xóa khi server khởi động lại (do đặc tính đĩa cứng tạm thời của các dịch vụ Cloud). Nếu cần lưu trữ lâu dài, hãy cân nhắc sử dụng Cloudinary hoặc AWS S3 trong tương lai.

# Hướng dẫn chi tiết Setup VPS cho Smart Learn

Tài liệu này hướng dẫn bạn cách thiết lập một server Ubuntu trắng để chạy dự án Smart Learn.

## 1. Kết nối với GitHub (Sử dụng SSH Key)
Để server có quyền tải code từ GitHub mà không cần mật khẩu:

1. **Tạo SSH Key**:
   ```bash
   ssh-keygen -t ed25519 -C "email_cua_ban@example.com"
   # Nhấn Enter liên tục
   ```
2. **Lấy mã Public Key**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. **Thêm vào GitHub**: Copy mã hiện ra -> GitHub -> Settings -> SSH and GPG keys -> New SSH key.

4. **Clone code**:
   ```bash
   git clone git@github.com:USERNAME/REPO_NAME.git smartlearn
   cd smartlearn
   ```

## 2. Cài đặt môi trường cơ bản
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt các công cụ cần thiết
sudo apt install -y curl git build-essential
```

## 2. Cài đặt Node.js (v20.x)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Cài đặt PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib

# Thiết lập Database
sudo -i -u postgres psql -c "CREATE DATABASE smartlearn;"
sudo -i -u postgres psql -c "CREATE USER smartuser WITH PASSWORD 'thay_doi_mat_khau_tai_day';"
sudo -i -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smartlearn TO smartuser;"

# Lưu ý quan trọng: Với Postgres 15+, bạn cần cấp quyền thêm cho public schema
sudo -i -u postgres psql -d smartlearn -c "GRANT ALL ON SCHEMA public TO smartuser;"
```

## 4. Cài đặt PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## 5. Triển khai Code
1. Clone dự án từ GitHub.
2. `npm install`
3. Tạo file `.env` với nội dung:
   ```env
   DATABASE_URL=postgres://smartuser:thay_doi_mat_khau_tai_day@localhost:5432/smartlearn
   PORT=3000
   NODE_ENV=production
   ```
4. Build dự án: `npm run build`
5. Chạy app: `pm2 start server/index.mjs --name smartlearn`
6. Lưu trạng thái: `pm2 save && pm2 startup`

## 6. Cấu hình FireWall (UFW)
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 3000
sudo ufw enable
```

## 7. (Tùy chọn) Cài đặt Nginx & SSL (HTTPS)
Để có domain đẹp và HTTPS miễn phí:
```bash
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx

# Sau đó cấu hình file /etc/nginx/sites-available/default để proxy về port 3000
# Cuối cùng chạy lệnh cấp SSL:
# sudo certbot --nginx -d domain_cua_ban.com
```

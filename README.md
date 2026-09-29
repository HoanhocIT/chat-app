# Chat App — Ứng Dụng Chat Mã Hóa Đầu Cuối (E2EE) & Chữ Ký Số

Ứng dụng nhắn tin thời gian thực (Fullstack Realtime Chat App) bảo vệ quyền riêng tư người dùng bằng mô hình mật mã lai:
- **AES-256-GCM:** Mã hóa đối xứng nội dung tin nhắn và file, đảm bảo tốc độ cao và tính toàn vẹn (Authenticated Encryption).
- **ElGamal Asymmetric Key (256-bit BigInt):** Mã hóa và trao đổi an toàn khóa phiên AES giữa các người dùng mà không cần gửi khóa phiên trực tiếp.
- **Chữ ký số ElGamal (ElGamal Digital Signature):** Người gửi ký lên chuỗi băm của tin nhắn bằng private key; người nhận dùng public key của người gửi để xác thực danh tính và phát hiện giả mạo.
- **SHA-256:** Hàm băm một chiều an toàn tạo thông điệp tóm lược (digest) trước khi ký số và kiểm tra toàn vẹn file đính kèm.
- **MD5 Comparison Tool:** Tính năng kiểm tra và đối chiếu giá trị hash MD5 trực quan ngay trên giao diện để phục vụ nghiên cứu, báo cáo học thuật.

---

## 🚀 Tính năng nổi bật

1. **Bảo mật tuyệt đối:** Cặp khóa ElGamal sinh hoàn toàn tại trình duyệt (Client-side). Server chỉ đóng vai trò chuyển tiếp bản tin đã mã hóa, không thể đọc trộm tin nhắn.
2. **Xác thực chữ ký số ElGamal:** Mỗi tin nhắn đều kèm con dấu xác thực nguồn gốc `(r, s)`. Nếu tin nhắn bị can thiệp trên đường truyền, hệ thống sẽ báo vi phạm chữ ký.
3. **Bộ công cụ kiểm tra MD5:** Cho phép xem và so sánh mã băm MD5 tức thì cho bất kỳ tin nhắn nào.
4. **Trả lời / Trích dẫn tin nhắn cũ (Quote & Reply):** Click trả lời trực tiếp từng tin nhắn.
5. **Đổi màu chủ đề (Theme Color):** Tùy chỉnh màu sắc bong bóng chat linh hoạt (Xanh Indigo, Tím Huyền Bí, Xanh Emerald, Hồng Hoàng Hôn, Tối Slate).
6. **Kiến trúc Single-Service Production:** Backend Express đóng gói và phục vụ trực tiếp Frontend React tĩnh — không lo lỗi CORS, không lệch port, WebSocket và HTTPS chạy chung một domain duy nhất.

---

## 🛠️ Chạy ứng dụng ở môi trường Local (Phát triển)

### Yêu cầu:
- Node.js ≥ 18.0.0
- npm ≥ 9.0.0

### Cách 1: Chạy đồng thời cả Frontend và Backend (Dev mode)
```bash
# Terminal 1: Khởi động Backend (Port 5000)
cd backend
npm install
npm run dev

# Terminal 2: Khởi động Frontend (Port 5173 / 5174)
cd frontend
npm install
npm run dev
```
Truy cập: `http://localhost:5173`

---

## 🌐 HƯỚNG DẪN DEPLOY LÊN SERVER INTERNET

Dự án đã được cấu hình tối ưu để deploy chỉ với vài bước đơn giản. Dưới đây là 3 cách phổ biến nhất:

---

### CÁCH 1: Deploy lên Render.com (KHUYÊN DÙNG — Miễn phí 100%, có sẵn SSL & WebSocket)

Render là nền tảng Cloud hiện đại hỗ trợ cực tốt Socket.IO, tự động cấp HTTPS và liên kết trực tiếp với GitHub.

#### Bước 1: Đẩy mã nguồn lên GitHub
1. Mở terminal tại thư mục `chat-app`:
   ```bash
   git init
   git add .
   git commit -m "Deploy chat-app fullstack"
   ```
2. Tạo một Repository mới trên [GitHub.com](https://github.com) (đặt tên ví dụ: `chat-app`).
3. Liên kết và đẩy code lên:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-github-cua-ban>/chat-app.git
   git push -u origin main
   ```

#### Bước 2: Tạo Web Service trên Render
1. Đăng ký/Đăng nhập tại [Render.com](https://render.com) (chọn Login with GitHub).
2. Nhấn nút **New +** → Chọn **Web Service**.
3. Chọn Repository `chat-app` bạn vừa đẩy lên GitHub.
4. Điền các thông tin cấu hình:
   - **Name:** `chat-app-elgamal` (hoặc tên bất kỳ bạn thích)
   - **Region:** `Singapore` (để tốc độ về Việt Nam nhanh nhất)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm run build
     ```
   - **Start Command:**
     ```bash
     npm run start
     ```
   - **Instance Type:** `Free`

#### Bước 3: Cấu hình Biến Môi Trường (Environment Variables)
Kéo xuống mục **Environment Variables** và thêm các biến sau:
- `NODE_ENV` = `production`
- `MONGO_URI` = `mongodb+srv://chatappadmin:Hoan11042005@cluster0.qweu9l7.mongodb.net/chatapp?retryWrites=true&w=majority`
- `JWT_SECRET` = `mot-chuoi-bi-mat-ngau-nhien-that-dai-va-an-toan-2026`
- `JWT_EXPIRES_IN` = `7d`

#### Bước 4: Triển khai
Nhấn **Create Web Service**. Render sẽ tự động:
1. Tải dependencies backend và frontend.
2. Build frontend React thành thư mục `frontend/dist`.
3. Khởi động server Express chạy cả REST API, Socket.IO và Web giao diện.
Sau khoảng 2-3 phút, bạn sẽ nhận được đường link dạng:
👉 `https://chat-app-elgamal.onrender.com` — mở ra là sử dụng được ngay lập tức!

---

### CÁCH 2: Deploy lên VPS Linux (Ubuntu / Debian với PM2 & Nginx)

Nếu bạn có máy chủ riêng (VPS DigitalOcean, Vultr, AWS, Linode hoặc VPS Việt Nam):

#### 1. Cài đặt môi trường trên VPS:
```bash
# Cập nhật hệ thống và cài đặt Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo npm install -g pm2
```

#### 2. Kéo code về VPS và build:
```bash
cd /var/www
git clone https://github.com/<tai-khoan>/chat-app.git
cd chat-app

# Cài đặt file môi trường backend
cp backend/.env.example backend/.env
nano backend/.env # Điền MONGO_URI và JWT_SECRET

# Cài đặt và build
npm run build
```

#### 3. Quản lý tiến trình bằng PM2:
```bash
pm2 start npm --name "chat-app" -- run start
pm2 save
pm2 startup
```

#### 4. Cấu hình Nginx Reverse Proxy (hỗ trợ WebSocket):
Tạo file `/etc/nginx/sites-available/chat-app`:
```nginx
server {
    listen 80;
    server_name your-domain.com; # Hoặc IP VPS

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Kích hoạt site và bật SSL miễn phí:
```bash
sudo ln -s /etc/nginx/sites-available/chat-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### CÁCH 3: Deploy với Docker & Docker Compose

Nếu server của bạn đã cài Docker:
```bash
# Chạy trực tiếp chỉ bằng 1 câu lệnh:
docker-compose up -d --build
```
Ứng dụng sẽ tự động chạy tại cổng `5000` của máy chủ.

---

## 🔒 Kiểm tra & Đảm bảo an toàn sau khi Deploy
- Database MongoDB Atlas: Hãy vào **MongoDB Atlas > Network Access** và đảm bảo đã bật `0.0.0.0/0` (Allow Access from Anywhere) để server cloud (Render / VPS) có thể kết nối đến DB mà không bị chặn IP.
- WebSocket: Toàn bộ kết nối Socket.IO tự động nâng cấp sang `wss://` an toàn khi chạy trên HTTPS.

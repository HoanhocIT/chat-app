# 🎓 BÁO CÁO THUYẾT TRÌNH & BẢO VỆ ĐỒ ÁN: CHAT-APP

> **Tên đề tài:** Xây dựng ứng dụng nhắn tin thời gian thực bảo mật đầu cuối (End-to-End Encryption) kết hợp mô hình mật mã lai AES-256-GCM + Trao khóa ElGamal, xác thực nguồn gốc bằng Chữ ký số ElGamal, đối chứng thực nghiệm hàm băm SHA-256 / MD5 và khôi phục tài khoản qua Email OTP.

---

## 📌 MỤC LỤC
1. [Tổng quan dự án & Vấn đề giải quyết](#1-tổng-quan-dự-án--vấn-đề-giải-quyết)
2. [Phần 1: Những công nghệ & Cơ sở hạ tầng tạo nên sản phẩm](#phần-1-những-công-nghệ--cơ-sở-hạ-tầng-tạo-nên-sản-phẩm)
3. [Phần 2: Các thuật toán mật mã & Cơ chế phối hợp nhịp nhàng](#phần-2-các-thuật-toán-mật-mã--cơ-chế-phối-hợp-nhịp-nhàng)
4. [Phần 3: Các tính năng nổi bật & Bộ công cụ thực nghiệm](#phần-3-các-tính-năng-nổi-bật--bộ-công-cụ-thực-nghiệm)
5. [Phần 4: Kịch bản thuyết trình mẫu (Demo Script 5-7 phút)](#phần-4-kịch-bản-thuyết-trình-mẫu-demo-script-5-7-phút)
6. [Phần 5: Bộ câu hỏi phản biện & Câu trả lời ghi điểm tối đa](#phần-5-bộ-câu-hỏi-phản-biện--câu-trả-lời-ghi-điểm-tối-đa)

---

## 1. TỔNG QUAN DỰ ÁN & VẤN ĐỀ GIẢI QUYẾT

### 1.1. Thực trạng & Đặt vấn đề
Hầu hết các ứng dụng nhắn tin trực tuyến phổ biến hiện nay chỉ mã hóa dữ liệu trên đường truyền (In-Transit Encryption qua giao thức TLS/HTTPS). Mô hình này tồn tại một lỗ hổng nghiêm trọng: **Tại máy chủ trung gian, dữ liệu bị giải mã thành văn bản rõ (Plaintext)**. Nếu máy chủ bị tin tặc xâm nhập, hoặc quản trị viên có ý đồ xấu, toàn bộ cuộc trò chuyện riêng tư của người dùng sẽ bị lộ.

### 1.2. Giải pháp của dự án
Dự án **Chat-app** áp dụng triệt để nguyên tắc **Zero-Knowledge End-to-End Encryption (E2EE)**:
- Toàn bộ việc mã hóa, giải mã, sinh khóa và ký số diễn ra **100% tại trình duyệt của người dùng (Client-side)**.
- Khóa bí mật (Private Key $x$) được lưu trữ cục bộ, **không bao giờ gửi qua Internet**.
- Máy chủ và Database MongoDB chỉ đóng vai trò chuyển tiếp "mù" (Blind Relay), chỉ lưu trữ các chuỗi Hex bản mã và chữ ký số. Kể cả khi toàn bộ Database bị rò rỉ, nội dung tin nhắn vẫn được bảo vệ tuyệt đối.

---

## PHẦN 1: NHỮNG CÔNG NGHỆ & CƠ SỞ HẠ TẦNG TẠO NÊN SẢN PHẨM

Hệ thống được xây dựng trên nền tảng Fullstack JavaScript hiện đại, kết hợp chặt chẽ giữa khả năng xử lý số học lớn, truyền tin thời gian thực và triển khai đám mây:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            KIẾN TRÚC HỆ THỐNG                               │
├─────────────────────────────────────┬───────────────────────────────────────┤
│       MÁY KHÁCH (FRONTEND)          │          MÁY CHỦ (BACKEND)            │
│  • React 18 + Vite (SPA)            │  • Node.js + Express.js               │
│  • Web Crypto API (AES Phần cứng)   │  • Socket.IO (WebSockets Realtime)    │
│  • BigInt ES6 (Số học ElGamal)      │  • MongoDB Atlas (Cloud Database)     │
│  • Quản lý khóa & Khôi phục mật khẩu│  • Resend HTTP API / SMTP Mailer      │
│  • Dark Mode Design System          │  • Bcrypt + JWT (Xác thực an toàn)    │
└─────────────────────────────────────┴───────────────────────────────────────┘
                                       │ Triển khai đám mây (Cloud)
                                       ▼
                       Render.com (Single-Service HTTPS + WSS)
```

### 1. Phía Máy Khách (Frontend):
- **React 18 & Vite:** Xây dựng ứng dụng đơn trang (SPA) cho trải nghiệm mượt mà, tốc độ build và render cực nhanh.
- **Web Crypto API (`window.crypto.subtle`):** Gọi trực tiếp tập lệnh mã hóa phần cứng của CPU ngay trong trình duyệt để xử lý thuật toán đối xứng **AES-256-GCM** với độ trễ cực thấp (< 1 mili-giây).
- **JavaScript BigInt:** Thư viện xử lý số nguyên lớn nguyên bản để giải quyết các phép toán số học mô-đun 256-bit của **ElGamal** mà không bị tràn số.
- **Lucide Icons & Web Audio API:** Hệ thống biểu tượng giao diện hiện đại và âm thanh phản hồi nhẹ nhàng khi gửi/nhận tin nhắn.

### 2. Phía Máy Chủ (Backend):
- **Node.js & Express.js:** Xử lý yêu cầu HTTP REST API theo mô hình Non-blocking I/O Event Loop, giúp máy chủ chịu tải hàng nghìn kết nối đồng thời với lượng tài nguyên CPU/RAM tối thiểu.
- **Socket.IO:** Thiết lập kênh truyền thông 2 chiều thời gian thực (Full-duplex WebSocket). Giúp tin nhắn gửi đi xuất hiện tức thì trên màn hình người nhận trong vài mili-giây mà không cần reload trang.
- **Bcrypt (12 Salt Rounds):** Thuật toán băm mật khẩu có độ phức tạp cao, chống tấn công vét cạn (Brute-Force) và bảng tra trước (Rainbow Table).
- **JSON Web Token (JWT):** Quản lý phiên làm việc của người dùng an toàn và không lưu trạng thái (Stateless).

### 3. Dịch Vụ Gửi Email & Khôi Phục Mật Khẩu:
- **Resend HTTP REST API & Nodemailer:** Gửi email chứa mã xác thực OTP 6 số qua giao thức HTTPS cổng 443 — vượt qua 100% các rào cản tường lửa chặn cổng SMTP trên môi trường Cloud (như Render), đảm bảo thư bay thẳng về hộp thư Gmail người nhận chỉ trong 0.5 giây.

### 4. Cơ Sở Dữ Liệu Đám Mây (Cloud Database):
- **MongoDB Atlas:** Cơ sở dữ liệu NoSQL phân tán toàn cầu.
- **Thiết kế Zero-Knowledge Schema:** Bảng `Message` chỉ lưu trữ chuỗi Hex của bản mã AES, các khối khóa phiên bọc ElGamal, chữ ký số $(r, s)$ và mã băm SHA-256. Máy chủ hoàn toàn không có khả năng đọc trộm nội dung.

### 5. Triển Khai Thực Tế (Cloud Deployment):
- **Kiến trúc Single-Service trên Render.com:** Máy chủ Express đóng gói và phục vụ trực tiếp Frontend React build (`frontend/dist`), giúp toàn bộ API, WebSockets và giao diện chạy chung một domain và cổng mạng, loại bỏ triệt để lỗi xung đột tên miền chéo (CORS) và tự động kích hoạt chứng chỉ bảo mật SSL (`https://` và `wss://`).

---

## PHẦN 2: CÁC THUẬT TOÁN MẬT MÃ & CƠ CHẾ PHỐI HỢP NHỊP NHÀNG

Trọng tâm học thuật của đề tài là **Mô hình Mật mã lai (Hybrid Cryptosystem)** kết hợp giữa mật mã đối xứng và bất đối xứng:

```
                                  QUY TRÌNH GỬI TIN NHẮN MÃ HÓA
                                  
  [Bản rõ "Xin chào"] ──┬──> [Băm SHA-256] ──> [Ký số ElGamal bằng Private Key A] ──> Chữ ký (r, s)
                        │
                        └──> [Mã hóa AES-256-GCM bằng Khóa phiên K] ──────────────────> Bản mã + IV + Tag
                                       ▲
                                       │
                      [Sinh ngẫu nhiên Khóa phiên K] ──> [Mã hóa ElGamal bằng Public Key B] ──> Khối (c1, c2)
```

### 1. Tại sao phải kết hợp AES và ElGamal? (Vấn đề bài toán)
- **Nếu chỉ dùng ElGamal:** ElGamal là mã hóa bất đối xứng trên số học lớn ($g^k \pmod p$). Nếu mã hóa cả một bức thư dài bằng ElGamal thì tốc độ tính toán rất chậm và kích thước dữ liệu sẽ phình to gấp 4-5 lần.
- **Nếu chỉ dùng AES:** AES-256 cực nhanh và mạnh, nhưng gặp bài toán "Làm sao để gửi chìa khóa AES cho người nhận qua mạng mà không bị kẻ trung gian nghe lén?".
- **Giải pháp Hybrid:**
  - Dùng **AES-256-GCM** để mã hóa nội dung tin nhắn dài $\rightarrow$ Đạt tốc độ tối đa và bảo toàn tính toàn vẹn (AEAD).
  - Dùng **ElGamal** để bọc chiếc chìa khóa AES 256-bit đó lại bằng Public Key của người nhận $\rightarrow$ Giải quyết triệt để bài toán trao khóa an toàn.

---

### 2. Bảng Tổng Hợp 5 Thuật Toán Trong Hệ Thống

| Thuật toán | Loại thuật toán | Vai trò trong hệ thống | Độ an toàn & Công thức cốt lõi |
|---|---|---|---|
| **AES-256-GCM** | Đối xứng (Symmetric) | Mã hóa nội dung văn bản thực tế | Chuẩn cấp quân sự (NIST), cơ chế AEAD với IV ngẫu nhiên 96-bit và Auth Tag 128-bit chống giả mạo khối |
| **ElGamal Key Encrypt** | Bất đối xứng (Asymmetric) | Mã hóa và trao đổi khóa phiên AES | Nhóm Galois $\mathbb{Z}_p^*$, Safe Prime 256-bit $p = 2q + 1$. Dựa trên độ khó của bài toán Logarithm rời rạc (DLP) |
| **Chữ ký số ElGamal** | Chữ ký điện tử (Digital Signature) | Xác thực danh tính & Chống giả mạo | Cặp chữ ký $(r, s)$: $r = g^k \pmod p$, $s = k^{-1}(m - x\cdot r) \pmod{p-1}$. Đảm bảo tính chống chối bỏ |
| **SHA-256** | Hàm băm (Hash) | Băm bản rõ thành tóm lược 256-bit trước khi ký | Chống va chạm tuyệt đối (Collision resistance), bảo toàn tính toàn vẹn |
| **MD5** | Hàm băm (Đối chứng) | So sánh thực nghiệm tốc độ và chiều dài với SHA-256 | Đã bị bẻ gãy va chạm từ 2004, hệ thống chỉ dùng cho mục đích thực nghiệm so sánh, không dùng bảo mật |

---

### 3. Quy trình 6 bước khép kín từ lúc Gửi đến lúc Nhận

#### Bước 1: Người gửi A soạn tin nhắn
Người A nhập: `"Xin chào B"`.

#### Bước 2: Mã hóa đối xứng AES-256-GCM
Trình duyệt A tự sinh một khóa đối xứng ngẫu nhiên $K$ (256-bit) và vector khởi tạo ngẫu nhiên $IV$ (96-bit). Sử dụng Web Crypto API mã hóa nội dung thành chuỗi bản mã Hex và sinh ra một thẻ xác thực $AuthTag$ (128-bit).

#### Bước 3: Mã hóa khóa phiên bằng ElGamal
Lấy Public Key của B: $\{p, g, y_B\}$. Chuyển khóa $K$ thành các khối số học và tính:
$$c_1 = g^k \pmod p$$
$$c_2 = K \cdot (y_B)^k \pmod p$$
Chỉ có người nắm giữ Private Key $x_B$ mới có thể giải mã được cặp $(c_1, c_2)$ này.

#### Bước 4: Tạo Chữ ký số ElGamal của người gửi
Bản rõ được băm bằng SHA-256 ra giá trị tóm lược $m$. Dùng khóa riêng tư $x_A$ của người gửi để sinh cặp chữ ký $(r, s)$:
$$r = g^k \pmod p$$
$$s = k^{-1}(m - x_A \cdot r) \pmod{p-1}$$

#### Bước 5: Truyền tải qua mạng
Gói tin được gửi qua Socket.IO lên MongoDB với cấu trúc:
$$\text{Payload} = \{ \text{CipherData, IV, AuthTag, KeyChunks}[(c_1, c_2)], \text{Signature}(r, s), \text{SenderPublicKey} \}$$
*Server chỉ thấy các chuỗi số Hex vô nghĩa, hoàn toàn không biết nội dung.*

#### Bước 6: Người nhận B nhận tin và giải mã
1. **Giải mã khóa AES:** Dùng Private Key $x_B$ tính: $K = c_2 \cdot (c_1^{x_B})^{-1} \pmod p$.
2. **Giải mã bản rõ:** Dùng khóa $K$ giải mã bản mã AES ra lại `"Xin chào B"`.
3. **Xác thực chữ ký số:** Dùng Public Key $y_A$ của A để kiểm tra phương trình:
   $$g^m \equiv (y_A)^r \cdot r^s \pmod p$$
   - Nếu đồng dư: Hiển thị biểu tượng **"✓ Chữ ký ElGamal HỢP LỆ"** (màu xanh).
   - Nếu không đồng dư (bị sửa đổi dù chỉ 1 bit): Báo động đỏ **"⚠ CẢNH BÁO GIẢ MẠO"**.

---

## PHẦN 3: CÁC TÍNH NĂNG NỔI BẬT & BỘ CÔNG CỤ THỰC NGHIỆM

Ứng dụng sở hữu đầy đủ các tính năng hiện đại kết hợp với phòng lab mật mã phục vụ nghiên cứu:

### 1. Tính năng người dùng hoàn chỉnh:
- **Đăng ký / Đăng nhập E2EE:** Trình duyệt tự sinh cặp khóa ElGamal $\{p, g, y\}$ và $\{p, g, x\}$ ngay lúc đăng ký; $x$ lưu trong `localStorage`, máy chủ chỉ lưu $y$.
- **Quên mật khẩu qua Email OTP (Mới):** Quy trình 2 bước khôi phục mật khẩu chuẩn bảo mật: gửi mã OTP 6 số qua Email (Resend HTTP API), băm mật khẩu mới bằng `bcrypt`.
- **Realtime Chat 1–1:** Truyền tin tức thì qua WebSocket, hiển thị trạng thái đang soạn tin (typing) và âm thanh gửi/nhận.
- **Trả lời tin nhắn cũ (Quote & Reply):** Trích dẫn tin nhắn cũ trực quan kèm hiệu ứng nhảy đến tin nhắn gốc.
- **Đổi màu chủ đề (Theme Color Customizer):** Tùy chỉnh màu sắc bong bóng chat với 6 theme hiện đại.

### 2. Các công cụ học thuật & thực nghiệm (Điểm sáng của đề tài):
- **Hộp Soi Mật Mã (Crypto Inspector):** Bấm vào bất kỳ tin nhắn nào để xem phân rã chi tiết gói tin mạng: Bản rõ, Bản mã Hex, IV 96-bit, Auth Tag 128-bit, các khối $(c_1, c_2)$ ElGamal, và cặp chữ ký $(r, s)$.
- **Phòng Thí Nghiệm Giả Mạo (Tamper Lab):** Giả lập tấn công Man-in-the-Middle. Cho phép sửa 1 chữ cái rồi kiểm tra lại chữ ký; hệ thống lập tức báo lỗi chữ ký không khớp.
- **Bộ Đo Lường Hiệu Năng Thực Tế (Benchmark Suite):** Bấm 1 nút để đo thời gian thực thi của từng thuật toán trên CPU máy tính:
  - Sinh khóa ElGamal: ~20-50 ms
  - Mã hóa AES: < 1 ms
  - Mã hóa lai Hybrid: < 15 ms
  - Ký số & Xác thực ElGamal: < 10 ms
- **Đánh Giá Độ Phình Dữ Liệu (Data Overhead Calculator):** Bảng chi tiết dung lượng từng byte của Bản rõ vs Bản mã AES vs Khóa ElGamal vs Chữ ký số, tính ra tỷ lệ phình dữ liệu sau mã hóa.
- **Quản Lý Khóa Nâng Cao:** Xem số bí mật $x$, tải file backup `.json`, và nhập khóa (Import Key) khi đổi sang máy tính mới.

---

## PHẦN 4: KỊCH BẢN THUYẾT TRÌNH MẪU (DEMO SCRIPT 5-7 PHÚT)

Khi đứng trước Hội đồng chấm thi hoặc người nghe, hãy thuyết trình theo cấu trúc 4 bước rõ ràng sau:

### Bước 1: Mở đầu & Nêu bài toán (1 phút)
> *"Kính thưa quý thầy cô và các bạn, hầu hết các ứng dụng chat hiện nay đều có thể xem lén được tin nhắn nếu máy chủ của họ bị tấn công. Để giải quyết triệt để vấn đề này, nhóm em đã phát triển sản phẩm **Chat-app** — Ứng dụng nhắn tin thời gian thực với cơ chế **Mã hóa đầu cuối Zero-Knowledge** kết hợp **Mật mã lai AES-256 + Trao khóa ElGamal**, **Chữ ký số ElGamal**, và **Khôi phục tài khoản qua Email OTP**."*

### Bước 2: Demo tính năng Chat Realtime & Quên mật khẩu (2 phút)
- Mở 2 cửa sổ trình duyệt song song (User A và User B).
- Chỉ ra: *"Khi User A đăng ký, cặp khóa ElGamal 256-bit được sinh ra ngay tại trình duyệt máy khách, khóa bí mật $x$ không bao giờ gửi lên server."*
- Gửi tin nhắn từ A sang B: *"Tin nhắn xuất hiện tức thời trên máy B kèm biểu tượng chiếc khiên xanh 'Chữ ký ElGamal HỢP LỆ'."*
- Trình diễn nhanh tính năng **"Quên mật khẩu?"**: Nhập email, nhận mã OTP gửi về và đặt lại mật khẩu mới.

### Bước 3: Demo "Hộp Soi Mật Mã" & "Thử Nghiệm Giả Mạo" (3 phút) — **ĐIỂM NHẤN ĂN TIỀN**
- Click vào tin nhắn vừa gửi để mở **Hộp soi mật mã**:
  - *"Như thầy cô thấy, trên MongoDB chỉ lưu trữ chuỗi mã Hex và các khối số học ElGamal này, hoàn toàn không có văn bản rõ."*
- Chuyển sang tab **"Giả mạo (Tamper Lab)"**: Sửa nội dung tin nhắn và bấm "Kiểm tra lại chữ ký":
  - *"Hệ thống lập tức báo đỏ CẢNH BÁO GIẢ MẠO, chứng minh chữ ký số ElGamal phát hiện việc can thiệp dữ liệu 100%!"*
- Chuyển sang tab **"Thời gian & Kích thước"**: Bấm "Bắt đầu đo đạc":
  - *"Thời gian mã hóa và giải mã chỉ mất dưới 15 mili-giây, hoàn toàn đáp ứng chuẩn nhắn tin thời gian thực mà người dùng không cảm nhận thấy độ trễ."*

### Bước 4: Kết luận & Triển khai thực tế (1 phút)
> *"Sản phẩm đã được triển khai hoàn chỉnh trên Internet tại nền tảng đám mây Render.com với tên miền HTTPS và WebSocket bảo mật. Em xin cảm ơn thầy cô và sẵn sàng trả lời các câu hỏi phản biện."*

---

## PHẦN 5: BỘ CÂU HỎI PHẢN BIỆN & CÂU TRẢ LỜI GHI ĐIỂM TỐI ĐA

#### ❓ Câu 1: Tại sao không dùng ElGamal để mã hóa luôn tin nhắn mà phải dùng mô hình lai với AES?
**Trả lời:**
ElGamal là thuật toán mã hóa khóa công khai dựa trên các phép toán số học lớn trên trường Galois $\mathbb{Z}_p^*$. Nếu mã hóa trực tiếp một thông điệp dài bằng ElGamal, chi phí tính toán rất nặng nề và kích thước dữ liệu sẽ phình to gấp nhiều lần. Vì vậy, mô hình mật mã lai Hybrid là giải pháp chuẩn công nghiệp: dùng **AES-256-GCM** (được phần cứng CPU tăng tốc) để mã hóa nội dung với tốc độ cực nhanh, và chỉ dùng **ElGamal** để mã hóa chiếc chìa khóa AES 256-bit đó lại.

#### ❓ Câu 2: Tại sao mật khẩu tài khoản dùng Bcrypt mà không dùng SHA-256 hay MD5?
**Trả lời:**
Băm mật khẩu và băm thông điệp giải quyết 2 bài toán hoàn toàn trái ngược nhau:
- Hàm băm như SHA-256 hay MD5 được thiết kế để chạy **cực kỳ nhanh**, phù hợp cho việc tính tóm lược thông điệp trước khi ký số hoặc kiểm tra file.
- Ngược lại, băm mật khẩu cần một hàm băm **chậm có chủ đích (Slow Hash)** và có **muối ngẫu nhiên (Salt)** như Bcrypt. Điều này giúp ngăn chặn kẻ tấn công dùng card đồ họa GPU hoặc bảng Rainbow Table để vét cạn hàng tỷ mật khẩu mỗi giây.

#### ❓ Câu 3: MD5 trong đồ án đóng vai trò gì? Có gây mất an toàn cho hệ thống không?
**Trả lời:**
MD5 (128-bit) đã bị chứng minh là bị tấn công va chạm (Collision Attack) từ năm 2004. Trong dự án của em, MD5 **hoàn toàn không tham gia vào luồng bảo mật hay ký số thật**, mà được đưa vào với vai trò **đối chứng thực nghiệm** trong phòng lab của ứng dụng: giúp đo đạc, so sánh tốc độ băm và độ dài chuỗi băm giữa MD5 (128-bit) và SHA-256 (256-bit) để phục vụ báo cáo khoa học.

#### ❓ Câu 4: Nếu hacker chiếm được toàn bộ cơ sở dữ liệu MongoDB thì có đọc được tin nhắn không?
**Trả lời:**
Không thể đọc được. Vì hệ thống áp dụng kiến trúc **Zero-Knowledge**: Khóa bí mật $x$ của mỗi người dùng chỉ được lưu trữ cục bộ tại trình duyệt của họ. Trên Database của server chỉ lưu bản mã AES, các khối khóa phiên đã bọc ElGamal và chữ ký số. Kẻ tấn công muốn giải mã phải giải được bài toán Logarithm rời rạc (DLP) trên trường số lớn 256-bit, điều này là bất khả thi về mặt tính toán.

#### ❓ Câu 5: Khi đổi sang máy tính mới hoặc quên mật khẩu thì tin nhắn cũ giải mã như thế nào?
**Trả lời:**
Đúng theo nguyên tắc E2EE (tương tự Signal hay Telegram Secret Chat), thiết bị mới chưa có Private Key nên ban đầu tin nhắn cũ chưa thể giải mã. Hệ thống đã giải quyết bài toán này bằng tính năng **Quản lý khóa**: người dùng có thể tải file sao lưu khóa bí mật (`.json`) từ thiết bị cũ và dùng chức năng **Import Key** trên thiết bị mới để khôi phục và giải mã toàn bộ lịch sử trò chuyện. Đổi mật khẩu tài khoản chỉ thay đổi mật khẩu đăng nhập, không làm mất khóa ElGamal đã lưu trên máy.

# BÁO CÁO THUYẾT TRÌNH DỰ ÁN: CHAT-APP (E2EE & CHỮ KÝ SỐ ELGAMAL)

> **Đề tài:** Ứng dụng nhắn tin thời gian thực bảo mật đầu cuối (End-to-End Encryption) kết hợp mô hình mật mã lai AES-256-GCM + Trao khóa ElGamal, xác thực nguồn gốc bằng Chữ ký số ElGamal và đối chứng thực nghiệm hàm băm SHA-256 / MD5.

---

## MỤC LỤC
1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Phần 1: Những công nghệ tạo nên sản phẩm](#phần-1-những-công-nghệ-tạo-nên-sản-phẩm)
3. [Phần 2: Các thuật toán mật mã & Cơ chế phối hợp](#phần-2-các-thuật-toán-mật-mã--cơ-chế-phối-hợp)
4. [Phần 3: Các tính năng cốt lõi & Bộ công cụ thực nghiệm](#phần-3-các-tính-năng-cốt-lõi--bộ-công-cụ-thực-nghiệm)
5. [Phần 4: Kịch bản thuyết trình mẫu (Demo Script 5-7 phút)](#phần-4-kịch-bản-thuyết-trình-mẫu-demo-script-5-7-phút)
6. [Phần 5: Bộ câu hỏi phản biện & Câu trả lời ghi điểm tối đa](#phần-5-bộ-câu-hỏi-phản-biện--câu-trả-lời-ghi-điểm-tối-đa)

---

## 1. TỔNG QUAN DỰ ÁN

- **Mục tiêu:** Xây dựng một ứng dụng nhắn tin trực tuyến bảo vệ quyền riêng tư tuyệt đối cho người dùng theo nguyên tắc **Zero-Knowledge** (Máy chủ không thể đọc lén tin nhắn, không nắm giữ khóa bí mật).
- **Điểm đột phá:**
  - Không dựa vào bảo mật tầng mạng đơn thuần (chỉ HTTPS), mà thực hiện **mã hóa ngay tại trình duyệt của người gửi** và **chỉ giải mã tại trình duyệt của người nhận**.
  - Tích hợp sẵn **Bộ phòng thí nghiệm mật mã (Crypto Lab)** trực quan ngay trên giao diện web để phục vụ nghiên cứu, báo cáo học thuật và minh chứng thực nghiệm.

---

## PHẦN 1: NHỮNG CÔNG NGHỆ TẠO NÊN SẢN PHẨM

Hệ thống được xây dựng trên nền tảng Fullstack JavaScript hiện đại, tối ưu hóa cho ứng dụng thời gian thực và xử lý số học lớn:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KIẾN TRÚC HỆ THỐNG                            │
├───────────────────────────────────┬─────────────────────────────────────┤
│      FRONTEND (MÁY KHÁCH)         │         BACKEND (MÁY CHỦ)           │
│  • React 18 + Vite (SPA)          │  • Node.js + Express.js             │
│  • Web Crypto API (AES Phần cứng) │  • Socket.IO (WebSockets Realtime)  │
│  • BigInt ES6 (Toán học số lớn)   │  • MongoDB Atlas (Cloud Database)   │
│  • Dark Mode Design System        │  • JWT + Bcrypt (Xác thực tài khoản)│
└───────────────────────────────────┴─────────────────────────────────────┘
                                     │ Triển khai đám mây (Cloud)
                                     ▼
                      Render.com (Single-Service HTTPS + WSS)
```

### 1. Phía Máy Khách (Frontend Client):
- **React 18 & Vite:** Khung giao diện Single Page Application (SPA) cho tốc độ render giao diện tức thì, không giật lag.
- **Web Crypto API (SubtleCrypto):** Tận dụng tập lệnh mã hóa phần cứng của CPU ngay trong trình duyệt để mã hóa và giải mã khối AES-256-GCM với độ trễ cực thấp (< 1 mili-giây).
- **JavaScript BigInt:** Thư viện số nguyên lớn nguyên bản để tính toán các phép toán số học mô-đun 256-bit của thuật toán ElGamal mà không bị giới hạn bởi kiểu số 64-bit thông thường.
- **Lucide Icons & Sound FX:** Hệ thống biểu tượng trực quan và hiệu ứng âm thanh Web Audio API cảnh báo khi có tin nhắn đến.

### 2. Phía Máy Chủ (Backend Server):
- **Node.js & Express:** Xử lý các yêu cầu HTTP REST API bất đồng bộ (Non-blocking I/O) giúp máy chủ chịu tải hàng nghìn kết nối đồng thời với lượng RAM tối thiểu.
- **Socket.IO:** Thiết lập kênh truyền thông hai chiều thời gian thực (Full-duplex WebSocket). Giúp tin nhắn gửi đi lập tức xuất hiện trên màn hình người nhận trong vài mili-giây mà không cần tải lại trang.
- **Bcrypt:** Băm mật khẩu người dùng với 12 vòng muối ngẫu nhiên (salt rounds) để bảo vệ tuyệt đối trước các cuộc tấn công tra từ điển hoặc bảng cầu vồng (Rainbow Table).
- **JSON Web Token (JWT):** Duy trì phiên đăng nhập không trạng thái (Stateless Authentication).

### 3. Cơ Sở Dữ Liệu (Database):
- **MongoDB Atlas (Cloud Database):** Hệ quản trị cơ sở dữ liệu NoSQL đám mây. Lưu trữ tài khoản người dùng, danh sách hội thoại và các gói tin đã mã hóa.
- **Cơ chế lưu trữ Zero-Knowledge:** Trong bảng `Message`, MongoDB chỉ lưu trữ chuỗi Hex của bản mã AES, các khối khóa phiên ElGamal và cặp chữ ký số $(r, s)$. Kể cả khi toàn bộ Database bị rò rỉ, kẻ tấn công cũng không thể phục hồi được bất kỳ từ nào trong nội dung tin nhắn.

### 4. Triển Khai Thực Tế (Cloud Deployment):
- **Kiến trúc Single-Service trên Render.com:** Máy chủ Express đóng gói và phục vụ trực tiếp các tệp tĩnh Frontend React (`frontend/dist`).
- **Ưu điểm vượt trội:**
  - Chạy chung một cổng mạng và một tên miền duy nhất.
  - Triệt tiêu 100% lỗi xung đột tên miền chéo (CORS).
  - Tự động kích hoạt chứng chỉ bảo mật SSL/TLS (`https://` và `wss://`).

---

## PHẦN 2: CÁC THUẬT TOÁN MẬT MÃ & CƠ CHẾ PHỐI HỢP

Điểm cốt lõi của đề tài là **Mô hình Mật mã lai (Hybrid Cryptosystem)** kết hợp linh hoạt giữa mã hóa đối xứng và bất đối xứng:

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
- **Nếu chỉ dùng ElGamal:** ElGamal là mã hóa bất đối xứng trên số học lớn ($g^k \pmod p$). Nếu mã hóa cả một bức thư dài bằng ElGamal thì tốc độ tính toán sẽ rất chậm và kích thước dữ liệu sẽ phình to gấp nhiều lần.
- **Nếu chỉ dùng AES:** AES-256 cực nhanh và mạnh, nhưng gặp bài toán "Làm sao để gửi chìa khóa AES cho người nhận mà không bị kẻ trung gian nghe lén?".
- **Giải pháp Hybrid:**
  - Dùng **AES-256-GCM** để mã hóa nội dung tin nhắn dài $\rightarrow$ Đạt tốc độ tối đa.
  - Dùng **ElGamal** để bọc chiếc chìa khóa AES nhỏ bé đó lại bằng Public Key của người nhận $\rightarrow$ Giải quyết triệt để bài toán trao khóa an toàn.

---

### 2. Chi tiết từng thuật toán trong hệ thống

| Thuật toán | Loại thuật toán | Vai trò trong sản phẩm | Công thức / Tham số cốt lõi |
|---|---|---|---|
| **AES-256-GCM** | Mã hóa đối xứng | Mã hóa nội dung văn bản thực tế | Khóa 256-bit, IV 96-bit, Auth Tag 128-bit (AEAD) |
| **ElGamal Key Exchange** | Mã hóa bất đối xứng | Bọc và trao đổi khóa phiên AES | Nhóm Galois $\mathbb{Z}_p^*$, Safe Prime 256-bit $p=2q+1$, $y = g^x \pmod p$ |
| **ElGamal Digital Signature** | Chữ ký số | Xác thực danh tính & Chống giả mạo | Cặp $(r, s)$: $r = g^k \pmod p$, $s = k^{-1}(m - x\cdot r) \pmod{p-1}$ |
| **SHA-256** | Hàm băm một chiều | Băm bản rõ làm tóm lược (digest) trước khi ký | Chiều dài cố định 256-bit (64 hex characters) |
| **MD5** | Hàm băm (Đối chứng) | So sánh thực nghiệm tốc độ và chiều dài | 128-bit (32 hex). Minh chứng sự lỗi thời của MD5 |

---

### 3. Quy trình 6 bước khép kín từ lúc Gửi đến lúc Nhận

#### Bước 1: Người gửi A soạn tin nhắn
Người A gõ: `"Xin chào B"`.

#### Bước 2: Mã hóa đối xứng AES-256-GCM
Client tự sinh một khóa đối xứng ngẫu nhiên $K$ (256-bit). Dùng khóa $K$ cùng một Vector khởi tạo ngẫu nhiên $IV$ (96-bit) để mã hóa `"Xin chào B"` thành chuỗi bản mã Hex và một thẻ xác thực $AuthTag$ (128-bit).

#### Bước 3: Mã hóa khóa phiên bằng ElGamal
Lấy Khóa công khai của B: $\{p, g, y_B\}$. Chuyển khóa $K$ thành các khối số học và tính:
$$c_1 = g^k \pmod p$$
$$c_2 = K \cdot (y_B)^k \pmod p$$
Chỉ có người nắm giữ khóa bí mật $x_B$ mới có thể giải mã được cặp $(c_1, c_2)$ này.

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

## PHẦN 3: CÁC TÍNH NĂNG CỐT LÕI & BỘ CÔNG CỤ THỰC NGHIỆM

Ứng dụng sở hữu đầy đủ các tính năng thực tế kết hợp với các bộ công cụ phục vụ báo cáo:

1. **Hệ thống Chat thời gian thực:**
   - Đăng ký / Đăng nhập an toàn (sinh khóa tại trình duyệt).
   - Danh sách bạn bè, tìm kiếm, hiển thị trạng thái Online / Offline tức thời.
   - Trạng thái "Đang soạn tin nhắn..." (Typing indicator).
   - Trả lời / Trích dẫn tin nhắn cũ (Quote & Reply).
   - Đổi bảng màu chủ đề (Theme Color: Neon, Cyberpunk, Emerald, Sunset, Slate).

2. **Hộp Soi Mật Mã (Crypto Inspector Modal):**
   - Click vào bất kỳ tin nhắn nào để soi tường tận từng byte dữ liệu của gói tin mạng: Bản rõ, Bản mã AES, Khối khóa phiên ElGamal, Chữ ký số $(r, s)$.

3. **Phòng Thí Nghiệm Giả Mạo (Tamper Lab):**
   - Cho phép người dùng thử đóng vai Hacker (Man-in-the-Middle) sửa đổi nội dung tin nhắn. Nhấn nút kiểm tra sẽ thấy phương trình ElGamal phát hiện và cảnh báo giả mạo ngay lập tức.

4. **Bộ Đo Lường Hiệu Năng & Độ Phình Dữ Liệu (Benchmark & Overhead):**
   - Đo đạc thời gian thực thi của từng thuật toán trên CPU máy tính (tính theo ms).
   - Bảng phân tích chi tiết dung lượng từng byte của gói tin và tỉ lệ phình dữ liệu sau khi mã hóa.

5. **Quản Lý Khóa Toàn Diện (Key Management):**
   - Xem và sao chép khóa bí mật $x$.
   - Tải file sao lưu khóa dự phòng (`.json`).
   - Khôi phục / Nhập khóa riêng tư khi đăng nhập trên thiết bị mới để giải mã tin nhắn cũ.

---

## PHẦN 4: KỊCH BẢN THUYẾT TRÌNH MẪU (DEMO SCRIPT 5-7 PHÚT)

Khi đứng trước hội đồng hoặc khán giả, bạn hãy trình bày theo 4 bước sau:

### 1. Mở đầu (1 phút)
> *"Kính thưa thầy cô và các bạn, ngày nay quyền riêng tư trên Internet đang bị đe dọa nghiêm trọng. Ngay cả các ứng dụng phổ biến, nếu máy chủ bị tấn công hoặc người quản trị cố tình xem lén thì tin nhắn của chúng ta vẫn có thể bị lộ. Để giải quyết triệt để vấn đề này, nhóm em đã xây dựng sản phẩm **Chat-app** — Ứng dụng nhắn tin thời gian thực với cơ chế **Mã hóa đầu cuối Zero-Knowledge** kết hợp **Mật mã lai AES-256 + Trao khóa ElGamal** và **Chữ ký số ElGamal**."*

### 2. Demo Luồng Hoạt Động Cơ Bản (2 phút)
- **Mở 2 trình duyệt song song:** Một bên đăng nhập tài khoản User A, một bên đăng nhập User B.
- **Chỉ ra điểm đặc biệt khi đăng ký:** Trình duyệt tự sinh cặp khóa ElGamal 256-bit trước khi gửi thông tin lên server.
- **Gửi tin nhắn realtime:** Gõ tin nhắn từ A sang B, tin nhắn xuất hiện ngay lập tức kèm biểu tượng khiên xanh chữ ký hợp lệ.

### 3. Demo "Hộp Soi Mã Hóa" & Giả Lập Tấn Công (2 phút) - ĐIỂM ĂN TIỀN NHẤT
- Bấm vào tin nhắn vừa gửi ➜ Mở **Hộp soi mã hóa**:
  > *"Như thầy cô thấy, toàn bộ dữ liệu lưu trên MongoDB chỉ là chuỗi mã AES và các khối ElGamal này, máy chủ không thể đọc được nội dung."*
- Chuyển sang tab **"Giả mạo (Tamper)"**: Sửa chữ "Xin chào" thành "Xin tiền". Nhấn **"Chạy thuật toán xác thực lại chữ ký ElGamal"**:
  > *"Hệ thống lập tức báo đỏ cảnh báo giả mạo, chứng minh Chữ ký số ElGamal phát hiện can thiệp dữ liệu 100%!"*
- Chuyển sang tab **"Thời gian & Kích thước"**: Bấm **"Bắt đầu đo đạc"** để hội đồng thấy thời gian mã hóa cực nhanh (< 15ms) và bảng phân tích độ phình dữ liệu chi tiết.

### 4. Kết luận (1 phút)
> *"Sản phẩm đã được đóng gói và triển khai thực tế trên máy chủ Internet tại Render.com với tên miền HTTPS/WSS đầy đủ. Hệ thống chứng minh tính khả thi cao khi đưa các thuật toán mật mã học phức tạp vào vận hành mượt mà trên môi trường web hiện đại."*

---

## PHẦN 5: BỘ CÂU HỎI PHẢN BIỆN & CÂU TRẢ LỜI GHI ĐIỂM TỐI ĐA

Dưới đây là các câu hỏi mà hội đồng và thầy cô thường hỏi nhất:

#### Q1: Tại sao không dùng ElGamal để mã hóa luôn nội dung tin nhắn mà phải dùng thêm AES?
**Trả lời:**
> *"Dạ thưa thầy/cô, ElGamal là thuật toán mã hóa khóa công khai dựa trên các phép toán số học lớn $g^k \pmod p$. Nếu dùng ElGamal để mã hóa trực tiếp tin nhắn dài, độ phức tạp tính toán rất cao dẫn đến tốc độ chậm và độ phình dữ liệu tăng gấp nhiều lần. Vì vậy, mô hình mật mã lai Hybrid là giải pháp tối ưu: dùng AES-256-GCM (được phần cứng CPU hỗ trợ) để mã hóa nội dung với tốc độ cực nhanh, và chỉ dùng ElGamal để bọc chiếc chìa khóa phiên AES 256-bit đó lại."*

#### Q2: Tại sao mật khẩu tài khoản lại dùng Bcrypt mà không dùng SHA-256 hay MD5?
**Trả lời:**
> *"Dạ, băm mật khẩu và băm thông điệp giải quyết 2 bài toán hoàn toàn khác nhau:*
> - *Hàm băm như SHA-256 hay MD5 được thiết kế để chạy **cực kỳ nhanh**, phù hợp cho việc tính tóm lược thông điệp trước khi ký số hoặc kiểm tra file.*
> - *Ngược lại, lưu trữ mật khẩu cần một hàm băm **chậm có chủ đích (Slow Hash)** và có **muối ngẫu nhiên (Salt)** như Bcrypt. Điều này giúp ngăn chặn kẻ tấn công dùng card đồ họa GPU hoặc bảng Rainbow Table để vét cạn hàng tỷ mật khẩu mỗi giây."*

#### Q3: MD5 trong đồ án hoạt động ở đâu? Có gây mất an toàn không?
**Trả lời:**
> *"Dạ, thuật toán MD5 (128-bit) đã bị chứng minh là bị tấn công va chạm (Collision Attack) từ năm 2004. Trong dự án của em, MD5 **hoàn toàn không tham gia vào luồng bảo mật hay ký số thật**, mà được đưa vào với vai trò **đối chứng thực nghiệm** trong phòng lab của ứng dụng: giúp đo đạc, so sánh tốc độ băm và độ dài chuỗi băm giữa MD5 (128-bit) và SHA-256 (256-bit) để phục vụ báo cáo khoa học."*

#### Q4: Nếu kẻ xấu chiếm được quyền điều khiển Database MongoDB thì có đọc được tin nhắn không?
**Trả lời:**
> *"Dạ không thể đọc được. Vì hệ thống áp dụng kiến trúc **Zero-Knowledge**: Khóa bí mật $x$ của mỗi người dùng chỉ được lưu trữ cục bộ tại trình duyệt của họ. Trên Database của server chỉ lưu bản mã AES, các khối khóa phiên đã bọc ElGamal và chữ ký số. Không có khóa bí mật $x$, kẻ tấn công không thể giải bài toán Logarithm rời rạc (DLP) để tìm ra khóa phiên AES, do đó dữ liệu vẫn an toàn 100%."*

#### Q5: Khi người dùng đổi sang điện thoại hoặc máy tính mới thì làm sao đọc được tin nhắn cũ?
**Trả lời:**
> *"Dạ, đúng theo nguyên tắc E2EE (giống như WhatsApp hay Telegram Secret Chat), thiết bị mới chưa có Private Key nên ban đầu tin nhắn cũ sẽ chưa giải mã được. Em đã giải quyết bài toán này bằng tính năng **Quản lý khóa**: người dùng có thể tải file sao lưu khóa bí mật (`.json`) từ máy cũ và dùng chức năng **Import Key** trên thiết bị mới để khôi phục và giải mã toàn bộ lịch sử trò chuyện."*

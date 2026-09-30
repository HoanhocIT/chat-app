const nodemailer = require('nodemailer');

/**
 * Cấu hình gửi mail tối ưu cho Gmail trên môi trường Cloud (Render, VPS)
 * - Tự động xóa khoảng trắng nếu người dùng copy mã 16 chữ cái dạng "abcd efgh ijkl mnop"
 * - Sử dụng cổng 465 (SSL trực tiếp) để tránh bị chặn port 587 trên Cloud
 * - Đặt giới hạn timeout (10s) để không bao giờ bị treo vĩnh viễn
 */
function createTransporter() {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: true, // SSL trực tiếp trên 465
    auth: { user, pass },
    connectionTimeout: 10000, // 10 giây timeout
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Gửi email chứa mã OTP đặt lại mật khẩu
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} username - Tên tài khoản
 * @param {string} otpCode - Mã xác nhận 6 chữ số
 */
async function sendResetPasswordEmail(toEmail, username, otpCode) {
  const transporter = createTransporter();

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background: #0b1120; color: #f1f5f9; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #00f2fe 0%, #0891b2 100%); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #041019; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Chat-app E2EE</h1>
        <p style="margin: 4px 0 0 0; color: #082f49; font-size: 13px;">Bảo mật & Mã hóa đầu cuối</p>
      </div>
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; margin-top: 0;">Xin chào <strong>${username}</strong>,</p>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Dưới đây là mã xác thực OTP của bạn:
        </p>
        <div style="margin: 24px 0; text-align: center;">
          <div style="display: inline-block; background: #1e293b; border: 2px dashed #00f2fe; padding: 14px 28px; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #00f2fe; font-family: monospace;">
            ${otpCode}
          </div>
        </div>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
          ⏱️ Mã xác nhận này có hiệu lực trong vòng <strong>15 phút</strong>.<br/>
          ⚠️ Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
        </p>
      </div>
      <div style="background: #0f172a; padding: 14px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
        © 2026 Chat-app. Ứng dụng bảo mật mật mã lai ElGamal & AES.
      </div>
    </div>
  `;

  if (!transporter) {
    console.log('----------------------------------------------------');
    console.log(`📧 [GIẢ LẬP GỬI EMAIL - CHƯA CÓ EMAIL_USER HOẶC EMAIL_PASS]`);
    console.log(`👉 Người nhận: ${toEmail} (${username})`);
    console.log(`👉 MÃ OTP ĐẶT LẠI MẬT KHẨU: [ ${otpCode} ] (Hết hạn sau 15 phút)`);
    console.log('----------------------------------------------------');
    return {
      sent: true,
      simulated: true,
      otp: otpCode,
      message: 'Mã xác nhận đã được tạo (Chế độ mô phỏng - Chưa cài EMAIL_USER)',
    };
  }

  const cleanUser = (process.env.EMAIL_USER || '').trim();
  const mailOptions = {
    from: `"Chat-app Bảo Mật" <${cleanUser}>`,
    to: toEmail,
    subject: `[Chat-app] Mã OTP đặt lại mật khẩu: ${otpCode}`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Đã gửi email thực tế chứa OTP tới: ${toEmail}`);
    return { sent: true, simulated: false };
  } catch (err) {
    console.error('❌ Lỗi khi gửi email qua SMTP:', err.message);
    // Tự động chuyển về chế độ dự phòng nếu gửi thất bại (sai pass hoặc bị chặn) để người dùng không bị kẹt
    return {
      sent: true,
      simulated: true,
      otp: otpCode,
      warning: 'Không thể kết nối máy chủ gửi thư (' + err.message + ')',
    };
  }
}

module.exports = { sendResetPasswordEmail };

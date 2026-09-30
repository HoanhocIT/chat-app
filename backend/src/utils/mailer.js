const nodemailer = require('nodemailer');

/**
 * Cấu hình gửi mail (Hỗ trợ Gmail, Outlook, SMTP server bất kỳ)
 * Nếu chưa cấu hình EMAIL_USER và EMAIL_PASS, hệ thống sẽ in OTP ra console
 * và trả về kết quả giả lập để kiểm thử ngay mà không bị gián đoạn.
 */
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true cho 465, false cho 587
    auth: { user, pass },
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
    console.log(`📧 [GIẢ LẬP GỬI EMAIL - CHƯA CÓ EMAIL_USER TRONG .ENV]`);
    console.log(`👉 Người nhận: ${toEmail} (${username})`);
    console.log(`👉 MÃ OTP ĐẶT LẠI MẬT KHẨU: [ ${otpCode} ] (Hết hạn sau 15 phút)`);
    console.log('----------------------------------------------------');
    return {
      sent: true,
      simulated: true,
      otp: otpCode,
      message: 'Mã xác nhận đã được tạo (Chế độ mô phỏng - Xem tại console server)',
    };
  }

  const mailOptions = {
    from: `"Chat-app Bảo Mật" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `[Chat-app] Mã OTP đặt lại mật khẩu: ${otpCode}`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Đã gửi email thực tế chứa OTP tới: ${toEmail}`);
  return { sent: true, simulated: false };
}

module.exports = { sendResetPasswordEmail };

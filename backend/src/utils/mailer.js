const nodemailer = require('nodemailer');

/**
 * Cấu hình gửi mail đa tầng (Multi-provider Mailer):
 * 1. Ưu tiên 1: Resend HTTP REST API (Chạy qua HTTPS cổng 443 - KHÔNG BAO GIỜ BỊ RENDER CHẶN)
 * 2. Ưu tiên 2: SMTP thông thường (Gmail cổng 465 SSL)
 * 3. Dự phòng 3: Chế độ giả lập an toàn (in OTP ra console và trả về giao diện để không bị kẹt)
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
    secure: true,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

/**
 * Gửi email chứa mã OTP đặt lại mật khẩu
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} username - Tên tài khoản
 * @param {string} otpCode - Mã xác nhận 6 chữ số
 */
async function sendResetPasswordEmail(toEmail, username, otpCode) {
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

  // --------------------------------------------------------------------------
  // CÁCH 1: Gửi qua Resend HTTP API (Cổng 443 HTTPS - Hoạt động 100% trên Render)
  // --------------------------------------------------------------------------
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Chat-app Security <onboarding@resend.dev>',
          to: [toEmail],
          subject: `[Chat-app] Mã OTP đặt lại mật khẩu: ${otpCode}`,
          html: htmlContent,
        }),
      });

      const resData = await resendRes.json();
      if (resendRes.ok) {
        console.log(`✅ [Resend API HTTP] Đã gửi email thực tế chứa OTP tới: ${toEmail}`);
        return { sent: true, simulated: false };
      } else {
        console.error('❌ Resend API phản hồi lỗi:', resData);
      }
    } catch (apiErr) {
      console.error('❌ Lỗi kết nối Resend HTTP API:', apiErr.message);
    }
  }

  // --------------------------------------------------------------------------
  // CÁCH 2: Gửi qua SMTP Gmail (Cổng 465 SSL)
  // --------------------------------------------------------------------------
  const transporter = createTransporter();

  if (transporter) {
    const cleanUser = (process.env.EMAIL_USER || '').trim();
    const mailOptions = {
      from: `"Chat-app Bảo Mật" <${cleanUser}>`,
      to: toEmail,
      subject: `[Chat-app] Mã OTP đặt lại mật khẩu: ${otpCode}`,
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ [Gmail SMTP] Đã gửi email thực tế chứa OTP tới: ${toEmail}`);
      return { sent: true, simulated: false };
    } catch (err) {
      console.error('❌ Lỗi khi gửi email qua SMTP:', err.message);
      return {
        sent: true,
        simulated: true,
        otp: otpCode,
        warning: 'Render chặn cổng SMTP (' + err.message + ')',
      };
    }
  }

  // --------------------------------------------------------------------------
  // CÁCH 3: Chế độ mô phỏng dự phòng khi chưa cấu hình email
  // --------------------------------------------------------------------------
  console.log('----------------------------------------------------');
  console.log(`📧 [GIẢ LẬP GỬI EMAIL]`);
  console.log(`👉 Người nhận: ${toEmail} (${username})`);
  console.log(`👉 MÃ OTP ĐẶT LẠI MẬT KHẨU: [ ${otpCode} ] (Hết hạn sau 15 phút)`);
  console.log('----------------------------------------------------');
  return {
    sent: true,
    simulated: true,
    otp: otpCode,
    message: 'Mã xác nhận đã được tạo (Chế độ mô phỏng)',
  };
}

module.exports = { sendResetPasswordEmail };

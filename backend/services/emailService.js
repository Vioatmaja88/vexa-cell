const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendTransactionEmail({ to, subject, transaction }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9, #0c4a6e); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          .status.success { background: #d1fae5; color: #065f46; }
          .status.failed { background: #fee2e2; color: #991b1b; }
          .status.pending { background: #fef3c7; color: #92400e; }
          .detail { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔋 Vexa Cell</h1>
            <p>Notifikasi Transaksi</p>
          </div>
          <div class="content">
            <p>Halo ${transaction.user?.full_name || 'Customer'},</p>
            <p>Transaksi Anda telah ${transaction.status === 'success' ? 'berhasil diproses' : transaction.status === 'failed' ? 'gagal' : 'sedang diproses'}.</p>
            
            <div class="detail">
              <div class="row"><span>ID Transaksi</span><strong>${transaction.transaction_id}</strong></div>
              <div class="row"><span>Voucher</span><span>${transaction.voucher?.name}</span></div>
              <div class="row"><span>Nominal</span><span>${transaction.voucher?.nominal}</span></div>
              <div class="row"><span>Nomor</span><span class="font-mono">${transaction.target_number}</span></div>
              ${transaction.sn ? `<div class="row"><span>Serial Number</span><span class="font-mono">${transaction.sn}</span></div>` : ''}
              <div class="row"><span>Total</span><strong>Rp${transaction.total_amount?.toLocaleString('id-ID')}</strong></div>
              <div class="row"><span>Status</span><span class="status ${transaction.status}">${transaction.status.toUpperCase()}</span></div>
            </div>

            ${transaction.status === 'success' ? 
              '<p>Serial number telah dikirim ke nomor Anda. Simpan struk ini sebagai bukti transaksi.</p>' :
              transaction.status === 'failed' ?
              '<p>Maaf atas ketidaknyamanan ini. Saldo akan dikembalikan otomatis.</p>' :
              '<p>Mohon tunggu, kami sedang memproses transaksi Anda.</p>'
            }

            <div class="footer">
              <p>Terima kasih telah berbelanja di Vexa Cell</p>
              <p>Butuh bantuan? Hubungi support@vexacell.com</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Vexa Cell" <${process.env.SMTP_FROM || 'noreply@vexacell.com'}>`,
        to,
        subject,
        html
      });
      console.log(`Email sent to ${to}`);
      return { success: true };
    } catch (err) {
      console.error('Email send error:', err);
      return { success: false, error: err.message };
    }
  }

  async sendWelcomeEmail({ to, fullName }) {
    const html = `
      <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;">
        <h1 style="color:#0c4a6e;">Selamat Datang di Vexa Cell! 🎉</h1>
        <p>Halo ${fullName || 'Customer'},</p>
        <p>Terima kasih telah mendaftar di Vexa Cell. Anda sekarang dapat membeli voucher pulsa, data, dan game dengan harga terbaik.</p>
        <p style="text-align:center;margin:30px 0;">
          <a href="${process.env.BASE_URL}/" style="background:#0ea5e9;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;display:inline-block;">Mulai Belanja</a>
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Vexa Cell" <${process.env.SMTP_FROM || 'noreply@vexacell.com'}>`,
        to,
        subject: 'Selamat Datang di Vexa Cell!',
        html
      });
      return { success: true };
    } catch (err) {
      console.error('Welcome email error:', err);
      return { success: false };
    }
  }
}

module.exports = new EmailService();
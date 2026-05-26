const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
let isTestMode = true;

async function init() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        isTestMode = false;
        console.log('📧 Email REAL configurado vía ' + process.env.SMTP_HOST);
    } else {
        const account = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass }
        });
        console.log('📧 Email en modo TEST (Ethereal). Configura SMTP_HOST en .env para correos reales.');
    }
}

async function sendOrderConfirmation({ to, orderId, qrCode, qrBuffer, items, total }) {
    if (!transporter) return { previewUrl: null };

    const itemsHtml = items.map(i =>
        `<li><b>${i.name}</b> - ${parseFloat(i.price).toFixed(2)}€ (Recogida: ${i.producer_name || ''})</li>`
    ).join('');

    const mailOptions = {
        from: '"Kilómetro 0 Corporativo" <reservas@km0.es>',
        to,
        subject: 'Confirmación de Reserva #' + orderId,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <div style="text-align: center; color: #2ecc71;">
                    <h1>🌿 Kilómetro 0</h1>
                </div>
                <h2>¡Gracias por tu compra local!</h2>
                <p>Tu reserva ha sido procesada. Muestra el código QR al productor cuando vayas a recoger:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <img src="cid:qrcodeimg" alt="Código QR" style="width: 200px; height: 200px;">
                </div>
                <div style="background: #f9f9f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 1.5rem; font-weight: bold; letter-spacing: 2px;">
                    ${qrCode}
                </div>
                <h3>Detalles:</h3>
                <ul>${itemsHtml}</ul>
                <h3>Total: ${parseFloat(total).toFixed(2)}€</h3>
                <p>Apoyando a productores locales haces el mundo más sostenible. ¡Gracias!</p>
            </div>`,
        attachments: [{ filename: 'qrcode.png', content: qrBuffer, cid: 'qrcodeimg' }]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = isTestMode ? nodemailer.getTestMessageUrl(info) : null;
        if (isTestMode) console.log('📧 Email test (Ethereal) → ' + previewUrl);
        else console.log('📧 Email enviado a ' + to);
        return { previewUrl };
    } catch (e) {
        console.error('Error enviando email:', e.message);
        return { previewUrl: null };
    }
}

module.exports = { init, sendOrderConfirmation };

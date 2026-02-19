const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SENDER_MAIL,
        pass: process.env.MAIL_PASS
    }
});

const getDarkTemplate = (title, content) => `
    <div style="background-color: #080808; margin: 0; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #eeeeee;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);">
                <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: 800; letter-spacing: -1px;">${title}</h1>
            </div>
            <div style="padding: 40px 30px; line-height: 1.6;">
                ${content}
            </div>
            <div style="padding: 20px 30px; background-color: #0c0c0c; border-top: 1px solid #222222; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #666666;">&copy; 2026 Playbook.</p>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #222222; font-size: 10px; color: #444444; line-height: 1.4;">
                    <p><b>Disclaimer:</b> This platform does not force, encourage, or require any user to trade stocks.</p>
                    <p>All trade ideas are for informational purposes only and should not be considered financial advice. Users are solely responsible for their own investment decisions.</p>
                </div>
            </div>
        </div>
    </div>
`;

const sendEmail = async (to, subject, text, htmlContent, title = "Playbook Alert") => {
    try {
        const fromEmail = process.env.SENDER_MAIL;
        const html = getDarkTemplate(title, htmlContent);

        const info = await transporter.sendMail({
            from: `"Playbook" <${fromEmail}>`,
            to,
            subject,
            text,
            html
        });
        console.log(`Email sent successfully: ${info.messageId} to ${to}`);
    } catch (error) {
        console.error('CRITICAL: Error sending email via NodeMailer:');
        console.error(error);
    }
};

module.exports = { sendEmail };

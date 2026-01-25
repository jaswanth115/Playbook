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

const sendEmail = async (to, subject, text, html) => {
    try {
        const fromEmail = process.env.SENDER_MAIL;
        const disclaimer = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #888; text-align: center;">
                <p><b>Disclaimer:</b> This platform does not force, encourage, or require any user to trade stocks.</p>
                <p>All trade ideas are for informational purposes only and should not be considered financial advice. Users are solely responsible for their own investment decisions.</p>
            </div>
        `;

        const info = await transporter.sendMail({
            from: `"Playbook" <${fromEmail}>`,
            to,
            subject,
            text,
            html: html + disclaimer
        });
        console.log(`Email sent successfully: ${info.messageId} to ${to}`);
    } catch (error) {
        console.error('CRITICAL: Error sending email via NodeMailer:');
        console.error(error);
    }
};

module.exports = { sendEmail };

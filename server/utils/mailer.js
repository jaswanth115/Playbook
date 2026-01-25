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

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/mailer');

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Email validation (redundant but good practice)
        if (!email.endsWith('@mavs.uta.edu')) {
            return res.status(400).json({ message: 'Only UTA student emails are allowed' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ username, email, password: hashedPassword });

        // Set first user as admin (optional, or just manually set in DB)
        // For this task, I'll set a specific email as admin or provide a way
        if (email === 'jxv4230@mavs.uta.edu') user.role = 'admin';

        await user.save();

        // Send Welcome Email
        const welcomeHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #00f2fe;">Welcome to Playbook!</h1>
                </div>
                <h2 style="text-align: center; color: #333;">Hello, ${username}!</h2>
                <p style="text-align: center; color: #555;">
                    We're thrilled to have you onboard. Playbook is your ultimate portal for tracking and analyzing trades with the UTA community.
                </p>
                <p style="text-align: center; color: #555;">
                    Feel free to explore and level up your strategy. If you have any questions, we're here to help!
                </p>
                <div style="text-align: center; margin-top: 20px; color: #aaa;">
                    <p>&copy; 2026 Playbook UTA</p>
                </div>
            </div>
        `;
        await sendEmail(email, 'Welcome to Playbook!', `Welcome to Playbook, ${username}!`, welcomeHtml);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Account not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        console.log(`DEBUG: OTP for ${email} is ${otp}`);

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Playbook Password Reset</h2>
                <p>Hello,</p>
                <p>You requested a password reset for your Playbook account. Your One-Time Password (OTP) is:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; color: #000;">${otp}</span>
                </div>
                <p>This code will expire in 1 hour. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">Playbook UTA - Secure Trading Community</p>
            </div>
        `;

        await sendEmail(email, 'Your Playbook OTP', `Your OTP is: ${otp}`, html);
        res.json({ message: 'OTP sent to email' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.' });
        }

        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

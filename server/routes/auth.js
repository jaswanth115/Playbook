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

        // Email validation
        if (!email.endsWith('@gmail.com')) {
            return res.status(400).json({ message: 'Only @gmail.com emails are allowed' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include: 1 uppercase, 1 lowercase, 1 number, and 1 special character.' });
        }

        let user = await User.findOne({ email });

        if (user) {
            if (user.isVerified) {
                return res.status(400).json({ message: 'User already exists' });
            }
            // If exists but not verified, allow "overwriting" by updating credentials
            user.username = username;
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({ username, email, password: hashedPassword });
        }

        // Generate/Update verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 3600000; // 1 hour

        // Set specified email as admin
        if (email.toLowerCase() === 'jaswanthreddy.2019@gmail.com') {
            user.role = 'admin';
        }

        await user.save();

        // Send Verification OTP Email
        const welcomeHtml = `
            <h2 style="color: #ffffff; text-align: center;">Verify your email</h2>
            <p style="color: #bbbbbb; text-align: center;">
                Thanks for signing up! Please use the OTP below to verify your account and start exploring trade ideas.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; background: #222222; padding: 15px 25px; border-radius: 12px; color: #00f2fe; border: 1px solid #333;">${otp}</span>
            </div>
            <p style="text-align: center; color: #888888; font-size: 13px;">
                This code will expire in 1 hour.
            </p>
        `;
        await sendEmail(email, 'Verify your Playbook Account', `Your verification code is: ${otp}`, welcomeHtml, 'Welcome to Playbook!');

        res.status(201).json({ message: 'OTP sent to email for verification' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verify Signup
router.post('/verify-signup', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });

        if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Account verified successfully' });
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

        if (!user.isVerified) {
            return res.status(401).json({ message: 'Your account is not verified. Please verify using the OTP sent to your email or try signing up again.' });
        }

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


        const html = `
            <h2 style="color: #ffffff; text-align: center;">Password Reset</h2>
            <p style="color: #bbbbbb; text-align: center;">You requested a password reset for your Playbook account. Your One-Time Password (OTP) is:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; background: #222222; padding: 15px 25px; border-radius: 12px; color: #00f2fe; border: 1px solid #333;">${otp}</span>
            </div>
            <p style="text-align: center; color: #888888; font-size: 13px;">This code will expire in 1 hour. If you did not request this, please ignore this email.</p>
        `;

        await sendEmail(email, 'Your Playbook OTP', `Your OTP is: ${otp}`, html, 'Reset Password');
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

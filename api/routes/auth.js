const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const router = express.Router();

// Middleware untuk verifikasi JWT
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token tidak ditemukan' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'Token tidak valid' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token tidak valid' });
    }
};

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { nama, email, password } = req.body;

        // Validasi input
        if (!nama || !email || !password) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password minimal 6 karakter' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }

        // Create new user
        const newUser = new User({
            nama,
            email,
            password
        });

        await newUser.save();

        // Track visitor data dan kirim notifikasi
        const visitorData = await getVisitorData(req);
        await Visitor.create(visitorData);
        
        await sendTelegramNotification(`
📝 USER BARU DAFTAR

👤 Nama: ${nama}
📧 Email: ${email}
📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}
🌐 IP: ${visitorData.ip}
📱 Device: ${visitorData.platform}
🕒 Waktu: ${new Date().toLocaleString('id-ID')}
        `);

        res.status(201).json({ 
            message: 'Registrasi berhasil! Silakan login.',
            user: {
                id: newUser._id,
                nama: newUser.nama,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password harus diisi' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                nama: user.nama,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user._id,
                nama: req.user.nama,
                email: req.user.email,
                tanggalDaftar: req.user.tanggalDaftar
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Helper function to get visitor data
async function getVisitorData(req) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    return {
        ip,
        userAgent,
        platform: getPlatform(userAgent),
        browser: getBrowser(userAgent),
        language: req.headers['accept-language'] || 'Unknown',
        path: req.headers['referer'] || '/'
    };
}

// Helper functions
function getPlatform(userAgent) {
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'MacOS';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unknown';
}

function getBrowser(userAgent) {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

// Helper function to send Telegram notification
async function sendTelegramNotification(message) {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!botToken || !chatId) {
            console.log('Telegram credentials not set');
            return;
        }

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            console.error('Failed to send Telegram notification');
        }
    } catch (error) {
        console.error('Telegram notification error:', error);
    }
}

module.exports = { router, authMiddleware };

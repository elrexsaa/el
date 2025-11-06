const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const { 
    sendTelegramNotification, 
    sendNewUserNotification,
    getVisitorData 
} = require('../utils/telegram');
const { 
    validateUserData, 
    validateEmail, 
    validatePassword,
    sanitizeText 
} = require('../utils/validation');

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
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Token tidak valid' });
    }
};

// Optional auth middleware (untuk route yang tidak wajib login)
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            req.user = user;
        }
        
        next();
    } catch (error) {
        // Jika token tidak valid, lanjut tanpa user
        next();
    }
};

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        let { nama, email, password } = req.body;

        // Sanitize input
        nama = sanitizeText(nama);
        email = sanitizeText(email).toLowerCase();

        // Validasi input menggunakan utility function
        const validation = validateUserData(nama, email, password);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
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
        const visitorData = getVisitorData(req);
        await Visitor.create(visitorData);
        
        // Kirim notifikasi Telegram
        await sendNewUserNotification(
            { nama, email },
            visitorData
        );

        res.status(201).json({ 
            message: 'Registrasi berhasil! Silakan login.',
            user: {
                id: newUser._id,
                nama: newUser.nama,
                email: newUser.email,
                tanggalDaftar: newUser.tanggalDaftar
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: errors.join(', ') });
        }
        
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;

        // Sanitize input
        email = sanitizeText(email).toLowerCase();

        // Validasi input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password harus diisi' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Format email tidak valid' });
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

        // Update last login
        user.terakhirLogin = new Date();
        await user.save();

        res.json({
            message: 'Login berhasil!',
            token,
            user: {
                id: user._id,
                nama: user.nama,
                email: user.email,
                tanggalDaftar: user.tanggalDaftar,
                terakhirLogin: user.terakhirLogin
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
                tanggalDaftar: req.user.tanggalDaftar,
                terakhirLogin: req.user.terakhirLogin,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        let { nama } = req.body;

        // Sanitize input
        nama = sanitizeText(nama);

        if (!nama || nama.trim().length === 0) {
            return res.status(400).json({ error: 'Nama harus diisi' });
        }

        if (nama.length > 50) {
            return res.status(400).json({ error: 'Nama maksimal 50 karakter' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { nama },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: 'Profile berhasil diupdate',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Password lama dan baru harus diisi' });
        }

        if (!validatePassword(newPassword)) {
            return res.status(400).json({ 
                error: 'Password baru minimal 6 karakter dan mengandung huruf dan angka' 
            });
        }

        // Verify current password
        const user = await User.findById(req.user._id);
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Password lama tidak sesuai' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password berhasil diubah' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get user statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const Puisi = require('../models/Puisi');
        
        // Get puisi statistics
        const totalPuisi = await Puisi.countDocuments({ penulis: req.user._id });
        const totalLikes = await Puisi.aggregate([
            { $match: { penulis: req.user._id } },
            { $group: { _id: null, total: { $sum: '$jumlahSuka' } } }
        ]);
        
        const puisiByKategori = await Puisi.aggregate([
            { $match: { penulis: req.user._id } },
            { $group: { _id: '$kategori', count: { $sum: 1 } } }
        ]);

        // Get recent activity
        const recentPuisi = await Puisi.find({ penulis: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('judul jumlahSuka createdAt')
            .lean();

        res.json({
            statistics: {
                totalPuisi,
                totalLikes: totalLikes[0]?.total || 0,
                puisiByKategori,
                accountAge: Math.floor((new Date() - req.user.tanggalDaftar) / (1000 * 60 * 60 * 24))
            },
            recentActivity: recentPuisi
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Check email availability
router.get('/check-email', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email harus diisi' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Format email tidak valid' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        res.json({
            available: !existingUser,
            email: email
        });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Forgot password request
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email harus diisi' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Format email tidak valid' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        
        // Always return success to prevent email enumeration
        res.json({ 
            message: 'Jika email terdaftar, instruksi reset password akan dikirim' 
        });

        // In production, you would:
        // 1. Generate reset token
        // 2. Save token to database with expiry
        // 3. Send email with reset link
        if (user) {
            console.log(`Password reset requested for: ${email}`);
            // await sendPasswordResetEmail(user.email, resetToken);
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Verify token (untuk check token validity di frontend)
router.get('/verify-token', authMiddleware, async (req, res) => {
    try {
        res.json({
            valid: true,
            user: {
                id: req.user._id,
                nama: req.user.nama,
                email: req.user.email
            }
        });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Token tidak valid' });
    }
});

// Logout (client-side, tapi bisa tambahkan blacklist token jika needed)
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        // In production, you might want to implement token blacklisting
        // For now, we'll just return success and let client remove token
        
        res.json({ 
            message: 'Logout berhasil',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Delete account
router.delete('/account', authMiddleware, async (req, res) => {
    try {
        const { confirmation } = req.body;

        if (confirmation !== 'HAPUS AKUN SAYA') {
            return res.status(400).json({ 
                error: 'Konfirmasi tidak sesuai. Ketik "HAPUS AKUN SAYA" untuk menghapus akun.' 
            });
        }

        const Puisi = require('../models/Puisi');
        
        // Delete user's puisi
        await Puisi.deleteMany({ penulis: req.user._id });
        
        // Delete user
        await User.findByIdAndDelete(req.user._id);

        // Send notification
        await sendTelegramNotification(`
🗑️ AKUN DIHAPUS

👤 Nama: ${req.user.nama}
📧 Email: ${req.user.email}
🕒 Waktu: ${new Date().toLocaleString('id-ID')}
        `);

        res.json({ 
            message: 'Akun berhasil dihapus',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = { router, authMiddleware, optionalAuthMiddleware };

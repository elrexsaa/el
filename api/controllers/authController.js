const User = require('../models/User');
const Visitor = require('../models/Visitor');
const jwt = require('jsonwebtoken');
const { getVisitorData, sendTelegramNotification } = require('../utils/telegram');

class AuthController {
    // Register user
    static async register(req, res) {
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
            const visitorData = getVisitorData(req);
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
    }

    // Login user
    static async login(req, res) {
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
    }

    // Get current user profile
    static async getProfile(req, res) {
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
    }

    // Update user profile
    static async updateProfile(req, res) {
        try {
            const { nama } = req.body;
            
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
    }
}

module.exports = AuthController;

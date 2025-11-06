const express = require('express');
const { authMiddleware } = require('./auth');
const Puisi = require('../models/Puisi');
const router = express.Router();

// Get all published puisi dengan pagination dan filter
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const kategori = req.query.kategori;
        const search = req.query.search;

        let query = { status: 'published' };
        
        // Filter by kategori
        if (kategori && kategori !== 'all') {
            query.kategori = kategori;
        }

        // Search functionality
        if (search) {
            query.$text = { $search: search };
        }

        const puisi = await Puisi.find(query)
            .populate('penulis', 'nama email')
            .sort({ tanggal: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();

        const total = await Puisi.countDocuments(query);

        res.json({
            puisi,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get single puisi by ID
router.get('/:id', async (req, res) => {
    try {
        const puisi = await Puisi.findById(req.params.id)
            .populate('penulis', 'nama email')
            .populate('suka', 'nama');

        if (!puisi) {
            return res.status(404).json({ error: 'Puisi tidak ditemukan' });
        }

        res.json(puisi);
    } catch (error) {
        console.error('Get puisi detail error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Add new puisi
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { judul, konten, kategori, musik } = req.body;

        // Validasi input
        if (!judul || !konten || !kategori) {
            return res.status(400).json({ error: 'Judul, konten, dan kategori harus diisi' });
        }

        const newPuisi = new Puisi({
            judul,
            konten,
            penulis: req.user._id,
            penulisNama: req.user.nama,
            kategori,
            musik: musik || null
        });

        await newPuisi.save();
        await newPuisi.populate('penulis', 'nama email');

        res.status(201).json(newPuisi);
    } catch (error) {
        console.error('Add puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Update puisi
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { judul, konten, kategori, musik } = req.body;
        const puisi = await Puisi.findById(req.params.id);

        if (!puisi) {
            return res.status(404).json({ error: 'Puisi tidak ditemukan' });
        }

        // Check ownership
        if (puisi.penulis.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Anda tidak memiliki akses untuk mengubah puisi ini' });
        }

        const updatedPuisi = await Puisi.findByIdAndUpdate(
            req.params.id,
            { 
                judul: judul || puisi.judul,
                konten: konten || puisi.konten,
                kategori: kategori || puisi.kategori,
                musik: musik !== undefined ? musik : puisi.musik
            },
            { new: true, runValidators: true }
        ).populate('penulis', 'nama email');

        res.json(updatedPuisi);
    } catch (error) {
        console.error('Update puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Delete puisi
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const puisi = await Puisi.findById(req.params.id);

        if (!puisi) {
            return res.status(404).json({ error: 'Puisi tidak ditemukan' });
        }

        // Check ownership
        if (puisi.penulis.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menghapus puisi ini' });
        }

        await Puisi.findByIdAndDelete(req.params.id);
        res.json({ message: 'Puisi berhasil dihapus' });
    } catch (error) {
        console.error('Delete puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Like/unlike puisi
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const puisi = await Puisi.findById(req.params.id);

        if (!puisi) {
            return res.status(404).json({ error: 'Puisi tidak ditemukan' });
        }

        const hasLiked = puisi.suka.includes(req.user._id);

        if (hasLiked) {
            // Unlike
            await Puisi.findByIdAndUpdate(
                req.params.id,
                { 
                    $pull: { suka: req.user._id },
                    $inc: { jumlahSuka: -1 }
                }
            );
            res.json({ message: 'Puisi tidak disukai', liked: false });
        } else {
            // Like
            await Puisi.findByIdAndUpdate(
                req.params.id,
                { 
                    $push: { suka: req.user._id },
                    $inc: { jumlahSuka: 1 }
                }
            );
            res.json({ message: 'Puisi disukai', liked: true });
        }
    } catch (error) {
        console.error('Like puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get user's puisi
router.get('/user/mine', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const puisi = await Puisi.find({ penulis: req.user._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();

        const total = await Puisi.countDocuments({ penulis: req.user._id });

        res.json({
            puisi,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Get user puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;

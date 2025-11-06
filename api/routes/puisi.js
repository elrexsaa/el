const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Puisi = require('../models/Puisi');
const { sendNewPuisiNotification } = require('../utils/telegram');
const { validatePuisiData, validatePagination } = require('../utils/validation');
const router = express.Router();

// Get all published puisi dengan pagination dan filter
router.get('/', async (req, res) => {
    try {
        const { page, limit, kategori, search, sortBy } = req.query;
        
        // Validasi pagination
        const pagination = validatePagination(page, limit);
        if (!pagination.isValid) {
            return res.status(400).json({ error: pagination.errors.join(', ') });
        }

        let query = { status: 'published' };
        
        // Filter by kategori
        if (kategori && kategori !== 'all') {
            query.kategori = kategori;
        }

        // Search functionality
        if (search && search.trim() !== '') {
            query.$text = { $search: search.trim() };
        }

        // Sort options
        let sortOptions = { tanggal: -1 };
        if (sortBy === 'popular') {
            sortOptions = { jumlahSuka: -1, tanggal: -1 };
        } else if (sortBy === 'oldest') {
            sortOptions = { tanggal: 1 };
        }

        const puisi = await Puisi.find(query)
            .populate('penulis', 'nama email')
            .sort(sortOptions)
            .limit(pagination.limit)
            .skip((pagination.page - 1) * pagination.limit)
            .lean();

        const total = await Puisi.countDocuments(query);

        res.json({
            puisi,
            totalPages: Math.ceil(total / pagination.limit),
            currentPage: pagination.page,
            total,
            hasNext: pagination.page < Math.ceil(total / pagination.limit),
            hasPrev: pagination.page > 1
        });
    } catch (error) {
        console.error('Get puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get popular puisi
router.get('/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const popularPuisi = await Puisi.find({ status: 'published' })
            .sort({ jumlahSuka: -1, tanggal: -1 })
            .limit(limit)
            .populate('penulis', 'nama')
            .lean();

        res.json(popularPuisi);
    } catch (error) {
        console.error('Get popular puisi error:', error);
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

        // Increment view count (optional - bisa ditambahkan field views di model)
        await Puisi.findByIdAndUpdate(req.params.id, { 
            $inc: { jumlahDilihat: 1 } 
        });

        res.json(puisi);
    } catch (error) {
        console.error('Get puisi detail error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Add new puisi
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { judul, konten, kategori, musik, status } = req.body;

        // Validasi input
        const validation = validatePuisiData(judul, konten, kategori);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        const newPuisi = new Puisi({
            judul: judul.trim(),
            konten: konten.trim(),
            penulis: req.user._id,
            penulisNama: req.user.nama,
            kategori,
            musik: musik || null,
            status: status || 'published'
        });

        await newPuisi.save();
        await newPuisi.populate('penulis', 'nama email');

        // Kirim notifikasi Telegram untuk puisi baru
        await sendNewPuisiNotification({
            judul: newPuisi.judul,
            konten: newPuisi.konten,
            kategori: newPuisi.kategori
        }, {
            nama: req.user.nama,
            email: req.user.email
        });

        res.status(201).json({
            message: 'Puisi berhasil ditambahkan!',
            puisi: newPuisi
        });
    } catch (error) {
        console.error('Add puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Update puisi
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { judul, konten, kategori, musik, status } = req.body;
        
        const puisi = await Puisi.findById(req.params.id);
        if (!puisi) {
            return res.status(404).json({ error: 'Puisi tidak ditemukan' });
        }

        // Check ownership
        if (puisi.penulis.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Anda tidak memiliki akses untuk mengubah puisi ini' });
        }

        // Validasi input untuk update
        const validation = validatePuisiData(
            judul || puisi.judul, 
            konten || puisi.konten, 
            kategori || puisi.kategori
        );
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        const updateData = {
            judul: judul ? judul.trim() : puisi.judul,
            konten: konten ? konten.trim() : puisi.konten,
            kategori: kategori || puisi.kategori,
            musik: musik !== undefined ? musik : puisi.musik,
            status: status || puisi.status,
            updatedAt: new Date()
        };

        const updatedPuisi = await Puisi.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('penulis', 'nama email');

        res.json({
            message: 'Puisi berhasil diupdate',
            puisi: updatedPuisi
        });
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
        
        res.json({ 
            message: 'Puisi berhasil dihapus',
            deletedId: req.params.id
        });
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
            res.json({ 
                message: 'Puisi tidak disukai', 
                liked: false,
                jumlahSuka: puisi.jumlahSuka - 1
            });
        } else {
            // Like
            await Puisi.findByIdAndUpdate(
                req.params.id,
                { 
                    $push: { suka: req.user._id },
                    $inc: { jumlahSuka: 1 }
                }
            );
            res.json({ 
                message: 'Puisi disukai', 
                liked: true,
                jumlahSuka: puisi.jumlahSuka + 1
            });
        }
    } catch (error) {
        console.error('Like puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get user's puisi
router.get('/user/mine', authMiddleware, async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        
        // Validasi pagination
        const pagination = validatePagination(page, limit);
        if (!pagination.isValid) {
            return res.status(400).json({ error: pagination.errors.join(', ') });
        }

        let query = { penulis: req.user._id };
        
        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        const puisi = await Puisi.find(query)
            .sort({ createdAt: -1 })
            .limit(pagination.limit)
            .skip((pagination.page - 1) * pagination.limit)
            .lean();

        const total = await Puisi.countDocuments(query);

        // Get statistics
        const totalPublished = await Puisi.countDocuments({ 
            penulis: req.user._id, 
            status: 'published' 
        });
        const totalDrafts = await Puisi.countDocuments({ 
            penulis: req.user._id, 
            status: 'draft' 
        });
        const totalLikes = await Puisi.aggregate([
            { $match: { penulis: req.user._id } },
            { $group: { _id: null, total: { $sum: '$jumlahSuka' } } }
        ]);

        res.json({
            puisi,
            totalPages: Math.ceil(total / pagination.limit),
            currentPage: pagination.page,
            total,
            statistics: {
                totalPublished,
                totalDrafts,
                totalLikes: totalLikes[0]?.total || 0
            },
            hasNext: pagination.page < Math.ceil(total / pagination.limit),
            hasPrev: pagination.page > 1
        });
    } catch (error) {
        console.error('Get user puisi error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Get puisi statistics
router.get('/user/stats', authMiddleware, async (req, res) => {
    try {
        // Total puisi by kategori
        const kategoriStats = await Puisi.aggregate([
            { $match: { penulis: req.user._id } },
            { $group: { _id: '$kategori', count: { $sum: 1 } } }
        ]);

        // Puisi created per month (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await Puisi.aggregate([
            { 
                $match: { 
                    penulis: req.user._id,
                    createdAt: { $gte: sixMonthsAgo }
                } 
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Most liked puisi
        const mostLiked = await Puisi.find({ penulis: req.user._id })
            .sort({ jumlahSuka: -1 })
            .limit(3)
            .select('judul jumlahSuka tanggal')
            .lean();

        res.json({
            kategoriStats,
            monthlyStats,
            mostLiked
        });
    } catch (error) {
        console.error('Get puisi stats error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Search puisi dengan advanced filtering
router.get('/search/advanced', async (req, res) => {
    try {
        const { 
            q, // query text
            kategori, 
            author, 
            dateFrom, 
            dateTo, 
            minLikes,
            sortBy = 'recent',
            page = 1, 
            limit = 10 
        } = req.query;

        let query = { status: 'published' };
        
        // Text search
        if (q && q.trim() !== '') {
            query.$text = { $search: q.trim() };
        }

        // Filter by kategori
        if (kategori && kategori !== 'all') {
            query.kategori = kategori;
        }

        // Filter by author (user ID)
        if (author) {
            query.penulis = author;
        }

        // Filter by date range
        if (dateFrom || dateTo) {
            query.tanggal = {};
            if (dateFrom) query.tanggal.$gte = new Date(dateFrom);
            if (dateTo) query.tanggal.$lte = new Date(dateTo);
        }

        // Filter by minimum likes
        if (minLikes) {
            query.jumlahSuka = { $gte: parseInt(minLikes) };
        }

        // Sort options
        let sortOptions = {};
        switch (sortBy) {
            case 'popular':
                sortOptions = { jumlahSuka: -1, tanggal: -1 };
                break;
            case 'oldest':
                sortOptions = { tanggal: 1 };
                break;
            case 'most-liked':
                sortOptions = { jumlahSuka: -1 };
                break;
            default: // recent
                sortOptions = { tanggal: -1 };
        }

        const puisi = await Puisi.find(query)
            .populate('penulis', 'nama email')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean();

        const total = await Puisi.countDocuments(query);

        res.json({
            puisi,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total,
            hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
            hasPrev: parseInt(page) > 1
        });
    } catch (error) {
        console.error('Advanced search error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

module.exports = router;

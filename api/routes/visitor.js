const express = require('express');
const Visitor = require('../models/Visitor');
const router = express.Router();
const VisitorController = require('../controllers/VisitorController');

// Track visitor
router.get('/', async (req, res) => {
    try {
        const visitorData = {
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            platform: getPlatform(req.headers['user-agent']),
            browser: getBrowser(req.headers['user-agent']),
            language: req.headers['accept-language'] || 'Unknown',
            path: req.headers['referer'] || '/'
        };

        // Simpan ke database
        await Visitor.create(visitorData);

        res.json(visitorData);
    } catch (error) {
        console.error('Visitor tracking error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

// Get visitor statistics (untuk admin)
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalVisitors = await Visitor.countDocuments();
        const todayVisitors = await Visitor.countDocuments({
            createdAt: { $gte: today }
        });
        const uniqueVisitors = await Visitor.distinct('ip').then(ips => ips.length);

        // Browser statistics
        const browserStats = await Visitor.aggregate([
            {
                $group: {
                    _id: '$browser',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Platform statistics
        const platformStats = await Visitor.aggregate([
            {
                $group: {
                    _id: '$platform',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            totalVisitors,
            todayVisitors,
            uniqueVisitors,
            browserStats,
            platformStats
        });
    } catch (error) {
        console.error('Get visitor stats error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

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
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
}
// Public routes
router.get('/', VisitorController.trackVisitor);
router.get('/stats', VisitorController.getVisitorStats);
router.get('/realtime', VisitorController.getRealtimeStats);

module.exports = router;

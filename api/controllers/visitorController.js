const Visitor = require('../models/Visitor');
const { sendTelegramNotification } = require('../utils/telegram');

class VisitorController {
    // Track visitor
    static async trackVisitor(req, res) {
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
    }

    // Get visitor statistics
    static async getVisitorStats(req, res) {
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

            // Daily visitors for last 7 days
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);

            const dailyStats = await Visitor.aggregate([
                {
                    $match: {
                        createdAt: { $gte: last7Days }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            res.json({
                totalVisitors,
                todayVisitors,
                uniqueVisitors,
                browserStats,
                platformStats,
                dailyStats
            });
        } catch (error) {
            console.error('Get visitor stats error:', error);
            res.status(500).json({ error: 'Terjadi kesalahan' });
        }
    }

    // Get real-time visitor count
    static async getRealtimeStats(req, res) {
        try {
            const lastHour = new Date();
            lastHour.setHours(lastHour.getHours() - 1);

            const visitorsLastHour = await Visitor.countDocuments({
                createdAt: { $gte: lastHour }
            });

            const onlineVisitors = await Visitor.distinct('ip', {
                createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
            }).then(ips => ips.length);

            res.json({
                visitorsLastHour,
                onlineVisitors
            });
        } catch (error) {
            console.error('Get realtime stats error:', error);
            res.status(500).json({ error: 'Terjadi kesalahan' });
        }
    }
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
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
}

module.exports = VisitorController;

// Telegram utility functions

/**
 * Get visitor data from request
 */
function getVisitorData(req) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    return {
        ip,
        userAgent,
        platform: getPlatform(userAgent),
        browser: getBrowser(userAgent),
        language: req.headers['accept-language'] || 'Unknown',
        path: req.headers['referer'] || '/',
        timestamp: new Date().toISOString()
    };
}

/**
 * Send notification to Telegram
 */
async function sendTelegramNotification(message) {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!botToken || !chatId) {
            console.log('Telegram credentials not set');
            return false;
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
            return false;
        }

        return true;
    } catch (error) {
        console.error('Telegram notification error:', error);
        return false;
    }
}

/**
 * Send visitor notification to Telegram
 */
async function sendVisitorNotification(visitorData) {
    const message = `
👤 VISITOR BARU

🌐 IP: ${visitorData.ip}
📱 Device: ${visitorData.platform}
🔍 Browser: ${visitorData.browser}
🌍 Language: ${visitorData.language}
🕒 Time: ${new Date(visitorData.timestamp).toLocaleString('id-ID')}
📊 Path: ${visitorData.path}
    `;

    return await sendTelegramNotification(message);
}

/**
 * Send new user registration notification
 */
async function sendNewUserNotification(userData, visitorData) {
    const message = `
📝 USER BARU DAFTAR

👤 Nama: ${userData.nama}
📧 Email: ${userData.email}
📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}
🌐 IP: ${visitorData.ip}
📱 Device: ${visitorData.platform}
🕒 Waktu: ${new Date().toLocaleString('id-ID')}
    `;

    return await sendTelegramNotification(message);
}

/**
 * Send new puisi notification
 */
async function sendNewPuisiNotification(puisiData, userData) {
    const message = `
📖 PUISI BARU DITAMBAHKAN

✍️ Judul: ${puisiData.judul}
👤 Oleh: ${userData.nama}
📂 Kategori: ${puisiData.kategori}
📅 Waktu: ${new Date().toLocaleString('id-ID')}

${puisiData.konten.length > 100 ? puisiData.konten.substring(0, 100) + '...' : puisiData.konten}
    `;

    return await sendTelegramNotification(message);
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

module.exports = {
    getVisitorData,
    sendTelegramNotification,
    sendVisitorNotification,
    sendNewUserNotification,
    sendNewPuisiNotification,
    getPlatform,
    getBrowser
};

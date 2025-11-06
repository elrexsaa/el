const express = require('express');
const router = express.Router();

router.post('/visitor', async (req, res) => {
    try {
        const visitorData = req.body;
        
        await sendTelegramNotification(`
👤 VISITOR BARU

🌐 IP: ${visitorData.ip}
📱 Device: ${visitorData.platform}
🕒 Time: ${new Date(visitorData.timestamp).toLocaleString('id-ID')}
🌍 Language: ${visitorData.language}
🔍 Browser: ${visitorData.browser}
        `);

        res.json({ message: 'Notification sent' });
    } catch (error) {
        console.error('Telegram notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

async function sendTelegramNotification(message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
        console.log('Telegram credentials not set');
        return;
    }

    try {
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
            throw new Error('Telegram API error');
        }
    } catch (error) {
        console.error('Failed to send Telegram notification:', error);
    }
}

module.exports = router;

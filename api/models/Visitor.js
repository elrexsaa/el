const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        default: 'Unknown'
    },
    browser: {
        type: String,
        default: 'Unknown'
    },
    language: {
        type: String,
        default: 'Unknown'
    },
    country: {
        type: String,
        default: 'Unknown'
    },
    city: {
        type: String,
        default: 'Unknown'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    path: {
        type: String,
        default: '/'
    }
}, {
    timestamps: true
});

// Index untuk analytics
visitorSchema.index({ timestamp: -1 });
visitorSchema.index({ ip: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);

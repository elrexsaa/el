const mongoose = require('mongoose');

const puisiSchema = new mongoose.Schema({
    judul: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    konten: {
        type: String,
        required: true,
        trim: true
    },
    penulis: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    penulisNama: {
        type: String,
        required: true
    },
    kategori: {
        type: String,
        required: true,
        enum: ['cinta', 'alam', 'kehidupan', 'lainnya'],
        default: 'lainnya'
    },
    musik: {
        type: String,
        default: null
    },
    suka: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    jumlahSuka: {
        type: Number,
        default: 0
    },
    jumlahDilihat: {
        type: Number,
        default: 0
    },
    tanggal: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['published', 'draft'],
        default: 'published'
    }
}, {
    timestamps: true
});

// Index untuk pencarian
puisiSchema.index({ judul: 'text', konten: 'text' });
puisiSchema.index({ kategori: 1, tanggal: -1 });
puisiSchema.index({ penulis: 1, createdAt: -1 });
puisiSchema.index({ jumlahSuka: -1 });
puisiSchema.index({ status: 1 });

// Virtual untuk excerpt
puisiSchema.virtual('excerpt').get(function() {
    return this.konten.length > 150 
        ? this.konten.substring(0, 150) + '...' 
        : this.konten;
});

// Method untuk increment views
puisiSchema.methods.incrementViews = function() {
    this.jumlahDilihat += 1;
    return this.save();
};

module.exports = mongoose.model('Puisi', puisiSchema);

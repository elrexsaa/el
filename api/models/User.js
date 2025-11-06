const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    nama: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email tidak valid']
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },
    tanggalDaftar: {
        type: Date,
        default: Date.now
    },
    terakhirLogin: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profilePicture: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: 500,
        default: ''
    }
}, {
    timestamps: true
});

// Hash password sebelum menyimpan
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method untuk compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual untuk account age
userSchema.virtual('accountAge').get(function() {
    return Math.floor((new Date() - this.tanggalDaftar) / (1000 * 60 * 60 * 24));
});

// Method untuk update last login
userSchema.methods.updateLastLogin = function() {
    this.terakhirLogin = new Date();
    return this.save();
};

// Index untuk pencarian
userSchema.index({ email: 1 });
userSchema.index({ nama: 'text' });

module.exports = mongoose.model('User', userSchema);

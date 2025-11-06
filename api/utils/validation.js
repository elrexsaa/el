// Validation utility functions

/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function validatePassword(password) {
    // Minimum 6 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return passwordRegex.test(password);
}

/**
 * Validate URL format
 */
function validateURL(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Sanitize input text
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    
    return text
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate puisi data
 */
function validatePuisiData(judul, konten, kategori) {
    const errors = [];

    if (!judul || judul.trim().length === 0) {
        errors.push('Judul puisi harus diisi');
    } else if (judul.length > 100) {
        errors.push('Judul puisi maksimal 100 karakter');
    }

    if (!konten || konten.trim().length === 0) {
        errors.push('Konten puisi harus diisi');
    } else if (konten.length > 5000) {
        errors.push('Konten puisi maksimal 5000 karakter');
    }

    const validCategories = ['cinta', 'alam', 'kehidupan', 'lainnya'];
    if (!kategori || !validCategories.includes(kategori)) {
        errors.push('Kategori puisi tidak valid');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate user registration data
 */
function validateUserData(nama, email, password) {
    const errors = [];

    if (!nama || nama.trim().length === 0) {
        errors.push('Nama harus diisi');
    } else if (nama.length > 50) {
        errors.push('Nama maksimal 50 karakter');
    }

    if (!email || email.trim().length === 0) {
        errors.push('Email harus diisi');
    } else if (!validateEmail(email)) {
        errors.push('Format email tidak valid');
    }

    if (!password || password.length === 0) {
        errors.push('Password harus diisi');
    } else if (!validatePassword(password)) {
        errors.push('Password minimal 6 karakter dan mengandung huruf dan angka');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate pagination parameters
 */
function validatePagination(page, limit) {
    const errors = [];

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1) {
        errors.push('Halaman tidak valid');
    }

    if (limitNum < 1 || limitNum > 100) {
        errors.push('Limit harus antara 1 dan 100');
    }

    return {
        isValid: errors.length === 0,
        errors,
        page: pageNum,
        limit: limitNum
    };
}

/**
 * Generate random string for IDs or tokens
 */
function generateRandomString(length = 32) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
}

/**
 * Format date to Indonesian locale
 */
function formatIndonesianDate(date) {
    return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

module.exports = {
    validateEmail,
    validatePassword,
    validateURL,
    sanitizeText,
    validatePuisiData,
    validateUserData,
    validatePagination,
    generateRandomString,
    formatIndonesianDate,
    truncateText
};

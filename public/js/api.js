// API Configuration
const API_BASE_URL = '/api';

class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials,
        });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
        });
    }

    async getProfile(token) {
        return this.request('/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    // Puisi endpoints
    async getPuisi() {
        return this.request('/puisi');
    }

    async addPuisi(puisiData, token) {
        return this.request('/puisi', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: puisiData,
        });
    }

    async likePuisi(puisiId, token) {
        return this.request(`/puisi/${puisiId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    // Visitor tracking
    async trackVisitor() {
        return this.request('/visitor');
    }
}

// Create global API client instance
const apiClient = new ApiClient();

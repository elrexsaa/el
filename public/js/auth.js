// Authentication JavaScript
class AuthManager {
    constructor() {
        this.initAuthForms();
    }

    initAuthForms() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Add puisi form
        document.getElementById('addPuisiForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddPuisi();
        });
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userName', data.user.nama);
                
                document.getElementById('navAuth').style.display = 'none';
                document.getElementById('navUser').style.display = 'flex';
                document.getElementById('userName').textContent = data.user.nama;
                
                closeModal('loginModal');
                this.showNotification('Login berhasil!', 'success');
                app.fetchUserProfile();
            } else {
                this.showNotification(data.error || 'Login gagal', 'error');
            }
        } catch (error) {
            this.showNotification('Terjadi kesalahan saat login', 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nama: name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Registrasi berhasil! Silakan login.', 'success');
                closeModal('registerModal');
                showLoginModal();
            } else {
                this.showNotification(data.error || 'Registrasi gagal', 'error');
            }
        } catch (error) {
            this.showNotification('Terjadi kesalahan saat registrasi', 'error');
        }
    }

    async handleAddPuisi() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.showNotification('Silakan login terlebih dahulu', 'error');
            return;
        }

        const judul = document.getElementById('puisiTitle').value;
        const konten = document.getElementById('puisiContent').value;
        const kategori = document.getElementById('puisiCategory').value;
        const musik = document.getElementById('puisiMusic').value;

        try {
            const response = await fetch('/api/puisi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ judul, konten, kategori, musik })
            });

            if (response.ok) {
                this.showNotification('Puisi berhasil ditambahkan!', 'success');
                closeModal('addPuisiModal');
                document.getElementById('addPuisiForm').reset();
                app.loadPuisi(); // Reload puisi list
            } else {
                this.showNotification('Gagal menambahkan puisi', 'error');
            }
        } catch (error) {
            this.showNotification('Terjadi kesalahan', 'error');
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        
        document.getElementById('navAuth').style.display = 'flex';
        document.getElementById('navUser').style.display = 'none';
        
        this.showNotification('Logout berhasil', 'success');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Global logout function
function logout() {
    const authManager = new AuthManager();
    authManager.logout();
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

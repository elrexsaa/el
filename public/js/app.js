// Main Application JavaScript
class PuisiApp {
    constructor() {
        this.puisiData = [];
        this.currentFilter = 'all';
        this.currentMusic = null;
        this.init();
    }

    init() {
        this.loadPuisi();
        this.setupEventListeners();
        this.trackVisitor();
        this.checkAuthStatus();
    }

    async loadPuisi() {
        try {
            const response = await fetch('/api/puisi');
            const data = await response.json();
            this.puisiData = data.puisi || data;
            this.renderPuisi();
        } catch (error) {
            console.error('Error loading puisi:', error);
        }
    }

    renderPuisi() {
        const grid = document.getElementById('puisiGrid');
        const filteredPuisi = this.currentFilter === 'all' 
            ? this.puisiData 
            : this.puisiData.filter(puisi => puisi.kategori === this.currentFilter);

        grid.innerHTML = filteredPuisi.map(puisi => `
            <div class="puisi-card" data-category="${puisi.kategori}">
                <h3 class="puisi-title">${puisi.judul}</h3>
                <div class="puisi-meta">
                    <span>Oleh: ${puisi.penulisNama || puisi.penulis?.nama}</span>
                    <span>${new Date(puisi.tanggal).toLocaleDateString('id-ID')}</span>
                    ${puisi.jumlahSuka > 0 ? `<span><i class="fas fa-heart"></i> ${puisi.jumlahSuka}</span>` : ''}
                </div>
                <div class="puisi-content">${puisi.konten}</div>
                <div class="puisi-actions">
                    ${puisi.musik ? `<button class="action-btn" onclick="app.playMusic('${puisi.musik}')">
                        <i class="fas fa-music"></i> Putar Musik
                    </button>` : ''}
                    <button class="action-btn" onclick="app.likePuisi('${puisi._id}')">
                        <i class="fas fa-heart"></i> Suka
                    </button>
                    <button class="action-btn" onclick="app.sharePuisi('${puisi._id}')">
                        <i class="fas fa-share-alt"></i> Bagikan
                    </button>
                    <button class="action-btn" onclick="app.downloadPuisiImage('${puisi._id}')">
                        <i class="fas fa-image"></i> Simpan Gambar
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderPuisi();
            });
        });

        // Music player
        const audioPlayer = document.getElementById('audioPlayer');
        const playBtn = document.getElementById('playBtn');
        const closeMusic = document.getElementById('closeMusic');

        playBtn.addEventListener('click', () => {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                audioPlayer.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });

        closeMusic.addEventListener('click', () => {
            this.stopMusic();
        });

        audioPlayer.addEventListener('ended', () => {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });

        // Navigation toggle
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    playMusic(url) {
        const audioPlayer = document.getElementById('audioPlayer');
        const musicPlayer = document.getElementById('musicPlayer');
        const nowPlaying = document.getElementById('nowPlaying');

        this.stopMusic();
        
        audioPlayer.src = url;
        audioPlayer.play();
        nowPlaying.textContent = 'Memutar musik...';
        musicPlayer.style.display = 'flex';
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
        
        this.currentMusic = audioPlayer;
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }
        document.getElementById('musicPlayer').style.display = 'none';
    }

    async likePuisi(puisiId) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.showNotification('Silakan login untuk menyukai puisi', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/puisi/${puisiId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                this.loadPuisi(); // Reload untuk update jumlah like
            } else {
                this.showNotification('Gagal menyukai puisi', 'error');
            }
        } catch (error) {
            console.error('Like error:', error);
            this.showNotification('Terjadi kesalahan', 'error');
        }
    }

    async sharePuisi(puisiId) {
        const puisi = this.puisiData.find(p => p._id === puisiId);
        if (!puisi) return;

        const shareText = `${puisi.judul}\n\n${puisi.konten}\n\n- ${puisi.penulisNama || puisi.penulis?.nama}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: puisi.judul,
                    text: shareText,
                    url: window.location.href
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareText);
            this.showNotification('Puisi telah disalin ke clipboard!', 'success');
        }
    }

    async downloadPuisiImage(puisiId) {
        const puisi = this.puisiData.find(p => p._id === puisiId);
        if (!puisi) return;

        // Create canvas for image generation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 1200;
        canvas.height = 630;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#8B5FBF');
        gradient.addColorStop(1, '#6C63FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add content
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Playfair Display';
        ctx.textAlign = 'center';
        ctx.fillText(puisi.judul, canvas.width / 2, 100);

        ctx.font = '24px Inter';
        ctx.fillText(`Oleh: ${puisi.penulisNama || puisi.penulis?.nama}`, canvas.width / 2, 150);

        // Wrap text
        const lines = this.wrapText(ctx, puisi.konten, canvas.width - 100, 400, 30);
        lines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, 250 + (index * 40));
        });

        // Add watermark
        ctx.font = '16px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('PuisiKu.com', canvas.width - 100, canvas.height - 30);

        // Download image
        const link = document.createElement('a');
        link.download = `puisi-${puisi.judul.toLowerCase().replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    wrapText(ctx, text, maxWidth, y, lineHeight) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    async trackVisitor() {
        try {
            const response = await fetch('/api/visitor');
            const visitorData = await response.json();
            
            // Send to Telegram
            await fetch('/api/telegram/visitor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(visitorData)
            });
        } catch (error) {
            console.error('Error tracking visitor:', error);
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            document.getElementById('navAuth').style.display = 'none';
            document.getElementById('navUser').style.display = 'flex';
            this.fetchUserProfile();
        }
    }

    async fetchUserProfile() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('userName').textContent = data.user.nama;
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
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

// Global functions for modal handling
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function showAddPuisiModal() {
    document.getElementById('addPuisiModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function scrollToPuisi() {
    document.getElementById('puisi').scrollIntoView({ behavior: 'smooth' });
}

// Initialize app
const app = new PuisiApp();

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

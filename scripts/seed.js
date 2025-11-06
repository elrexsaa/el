require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../api/models/User');
const Puisi = require('../api/models/Puisi');

const MONGODB_URI = process.env.MONGODB_URI;

const samplePuisi = [
    {
        judul: "Senja di Pelabuhan Kecil",
        konten: "Perahu-perahu berlalu\nMembawa kenangan yang lalu\nSenja datang merayu\nDi pelabuhan yang sunyi\n\nOmbak berbisik pelan\nMenyampaikan rindu yang tertahan\nPada senja yang perlahan\nMenutup hari dengan damai",
        penulisNama: "Sastrawan Muda",
        kategori: "alam",
        musik: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
        judul: "Cinta Pertama",
        konten: "Di sudut hati yang paling dalam\nTerpatri namamu selamanya\nCinta pertama yang takkan terlupa\nBagai bintang di langit malam\n\nSetiap detik waktu berlalu\nMembawa kita pada kenangan baru\nTapi cinta pertama tetap sama\nBersinar terang dalam jiwa",
        penulisNama: "Pecinta Puisi",
        kategori: "cinta"
    },
    {
        judul: "Jejak Kehidupan",
        konten: "Setiap langkah meninggalkan jejak\nSetiap kata punya makna\nDalam lika-liku kehidupan\nKita belajar dan bertumbuh\n\nKadang jatuh, kadang bangun\nTapi semangat tak pernah padam\nKarena hidup adalah perjalanan\nYang penuh warna dan makna",
        penulisNama: "Filsuf Jalanan",
        kategori: "kehidupan"
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Puisi.deleteMany({});
        console.log('Cleared existing puisi data');

        // Insert sample data
        await Puisi.insertMany(samplePuisi);
        console.log('Sample puisi data inserted successfully');

        // Create sample user
        const sampleUser = await User.findOne({ email: 'demo@example.com' });
        if (!sampleUser) {
            await User.create({
                nama: 'Demo User',
                email: 'demo@example.com',
                password: 'demopassword123'
            });
            console.log('Sample user created: demo@example.com / demopassword123');
        }

        console.log('Database seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seedDatabase();

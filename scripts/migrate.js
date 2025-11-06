// Database migration script
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function runMigration() {
    try {
        console.log('Starting database migration...');
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Add any database migrations here
        // Example: Add new fields, update indexes, etc.

        console.log('Database migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

runMigration();

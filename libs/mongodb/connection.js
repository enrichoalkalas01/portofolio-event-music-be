const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_DB_URI || 'mongodb://localhost:27017/myapp_db';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
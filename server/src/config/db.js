const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bizora';
  
  try {
    // Attempt standard connection with 3-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    const isAtlas = uri.includes('mongodb+srv://') || uri.includes('mongodb.net');
    if (isAtlas) {
      console.log(`[MongoDB] MongoDB Atlas connected successfully`);
    } else {
      console.log(`[MongoDB] Connected successfully to host: ${mongoose.connection.host}`);
    }
  } catch (error) {
    console.warn(`[MongoDB] Could not connect to primary database: ${error.message}`);
    console.log(`[MongoDB] Starting In-Memory MongoDB Server fallback...`);
    
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const mongoUri = mongoMemoryServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`[MongoDB] Connected to In-Memory Database instance at: ${mongoUri}`);
    } catch (memErr) {
      console.error(`[MongoDB] Fatal error starting in-memory database:`, memErr);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

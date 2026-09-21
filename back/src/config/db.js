// config/db.js — MongoDB connection helper.
// Kept deliberately simple: one function, clear logging, never throws
// so a missing DB doesn't crash the whole demo server (see server.js).
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrisphere';
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected:', uri);
  } catch (err) {
    console.error('MongoDB connection failed. The API will keep running,');
    console.error('but any endpoint that reads/writes the DB will fail until it is reachable.');
    console.error('Reason:', err.message);
  }
}

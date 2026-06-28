const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cubevision';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(' MongoDB connected:', mongoose.connection.name);
    const col = mongoose.connection.collection('solvehistories');
    await col.createIndex({ date: -1 }).catch(() => {});
    await col.createIndex({ move_count: 1 }).catch(() => {});
    await col.createIndex({ user_id: 1, date: -1 }).catch(() => {});
    await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
  } catch (err) {
    console.warn(' MongoDB unavailable:', err.message, '— history disabled');
  }
}

module.exports = { connectDB };

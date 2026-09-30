const mongoose = require('mongoose');

const DEFAULT_MONGO_URI =
  'mongodb+srv://chatappadmin:Hoan11042005@cluster0.qweu9l7.mongodb.net/chatapp?retryWrites=true&w=majority';

async function connectDB() {
  const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB đã kết nối thành công');
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    console.error('👉 Hãy kiểm tra Network Access (IP 0.0.0.0/0) trên MongoDB Atlas!');
  }
}

module.exports = connectDB;

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    nickname: {
        type: String,
        default: '',
        trim: true,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    publicKey: {
        p: { type: String, required: true },
        g: { type: String, required: true },
        y: { type: String, required: true }
    },
    avatar: {
        type: String,
        default: '#4A90D9'
    },
    theme: {
        mode: { type: String, enum: ['light', 'dark'], default: 'light' },
        chatColor: { type: String, default: '#0084FF' }
    },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
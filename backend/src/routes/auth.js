const express = require('express');
const { register, login, forgotPassword, resetPassword, sendRegisterOtp } = require('../controllers/authController');

const router = express.Router();

router.post('/send-register-otp', sendRegisterOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);


module.exports = router;

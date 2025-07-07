const express = require('express');
const { login, logout, register, verifyOtp, forgotPassword, resetPassword } = require('../controllers/AuthController');
const authRouter = express.Router();

authRouter.use(express.json());

authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/register', register);
authRouter.post('/verify-otp', verifyOtp);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

module.exports = authRouter;

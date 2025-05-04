// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // 1. Tokenni header yoki cookiedan olish
  if (
    req.headers.authorization && 
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // "Bearer token" formatidan tokenni ajratib olish
      token = req.headers.authorization.split(' ')[1];
      
      // 2. Tokenni verify qilish
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 3. Foydalanuvchini bazadan topish (parolsiz)
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        res.status(401);
        throw new Error('Foydalanuvchi topilmadi');
      }
      
      next();
    } catch (error) {
      console.error('Token tekshirishda xato:', error);
      res.status(401);
      throw new Error('Avtorizatsiya amalga oshmadi');
    }
  }
  
  // Agar token bo'lmasa
  if (!token) {
    res.status(401);
    throw new Error('Token topilmadi, avtorizatsiya rad etildi');
  }
});

// Admin huquqlarini tekshirish middleware
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403);
    throw new Error('Admin huquqlari talab qilinadi');
  }
};

module.exports = { protect, admin };
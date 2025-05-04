const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Tokenni olish
      token = req.headers.authorization.split(' ')[1];
      
      // Tokenni tekshirish
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Foydalanuvchini topish (parolsiz)
      req.user = await User.findById(decoded.id).select('-password');
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Noto\'g\'ri token' });
    }
  }
  
  if (!token) {
    res.status(401).json({ message: 'Token mavjud emas' });
  }
};

module.exports = authMiddleware;
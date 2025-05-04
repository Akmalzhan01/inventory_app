const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Yangi foydalanuvchi ro'yxatdan o'tkazish
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Email tekshirish
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
    }

    // Yangi foydalanuvchi yaratish
    const user = await User.create({ name, email, password, role });

    // JWT token yaratish
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Foydalanuvchi kirishi
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Foydalanuvchini topish
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Noto\'g\'ri email' });
    }

    // Parolni tekshirish
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Noto\'g\'ri parol' });
    }

    // JWT token yaratish
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Token generatsiya qilish
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};


// @desc    Get logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;
const express = require('express');
const User = require('../models/User');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// @route   GET /api/users
// @desc    Barcha foydalanuvchilarni olish (faqat admin uchun)
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Bitta foydalanuvchini olish
router.get('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Foydalanuvchi ma'lumotlarini yangilash
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // Faqat admin boshqa foydalanuvchilarni o'zgartira oladi
    if (req.user.id !== user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Ruxsat etilmagan' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    
    // Faqat admin rolini o'zgartira oladi
    if (req.user.role === 'admin' && role) {
      user.role = role;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Foydalanuvchini o'chirish (faqat admin uchun)
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // O'zini o'chirishni oldini olish
    if (req.user.id === user.id) {
      return res.status(400).json({ message: 'O\'zingizni o\'chira olmaysiz' });
    }

    await user.remove();
    res.json({ message: 'Foydalanuvchi o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
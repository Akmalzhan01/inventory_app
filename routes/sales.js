const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/sales
// @desc    Barcha sotuvlarni olish
router.get('/', async (req, res) => {
  try {
    const sales = await require("../models/Sale").find()
      .populate('customer', 'name phone')
      .populate('seller', 'name')
      .populate('items.product', 'name sku price')
      .sort({ saleDate: -1 });
    res.json({count: sales.length, sales});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer, items, isCredit, paidAmount, seller } = req.body;

    // Items mavjudligini tekshirish
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Kamida 1 ta mahsulot kiritilishi kerak' });
    }

    // Tovarlarni tekshirish va narxni hisoblash
    const productUpdates = [];
    let total = 0;

    for (const item of items) {
      // Mahsulotni bazadan qidirish
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Tovar topilmadi ID: ${item.product}` });
      }

      // Miqdorni tekshirish
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Yetarli miqdor mavjud emas: ${product.name}`,
          available: product.quantity,
          requested: item.quantity
        });
      }

      // Yangilash uchun operatsiyani qo'shish
      productUpdates.push({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { quantity: -item.quantity } }
        }
      });

      // Summani hisoblash
      total += (item.price || product.price) * item.quantity;
    }

    // Nasiya to'lovini tekshirish
    if (isCredit && paidAmount > total) {
      return res.status(400).json({ 
        message: 'To\'lov summasi jami summadan katta',
        totalAmount: total,
        paidAmount: paidAmount
      });
    }

    // Sotuvni yaratish
    const sale = await Sale.create({
      customer: customer || null,
      items: items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price || (Product.findById(item.product)).price
      })),
      total,
      isCredit: isCredit || false,
      paidAmount: paidAmount || (isCredit ? 0 : total),
      seller
    });

    // Tovarlar miqdorini yangilash
    if (productUpdates.length > 0) {
      await Product.bulkWrite(productUpdates);
    }

    res.status(201).json({
      success: true,
      data: sale
    });

  } catch (error) {
    console.error('Sotuv yaratishda xato:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error
    });
  }
});

// @route   PUT /api/sales/:id/pay
// @desc    Nasiyani to'lash
router.put('/:id/pay', async (req, res) => {
  try {
    const { amount } = req.body;
    
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    if (!sale.isCredit) {
      return res.status(400).json({ message: 'Bu sotuv nasiya emas' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ message: 'Noto\'g\'ri to\'lov summasi' });
    }
    
    if (sale.paidAmount + amount > sale.total) {
      return res.status(400).json({ message: 'To\'lov summasi qarz miqdoridan oshib ketdi' });
    }
    
    sale.paidAmount += amount;
    await sale.save();
    
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/sales/:id
// @desc    Sotuvni bekor qilish (faqat admin uchun)
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sotuv topilmadi' });
    }
    
    // Tovarlarni qaytarish
    const productUpdates = [];
    for (const item of sale.items) {
      productUpdates.push({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { quantity: item.quantity } }
        }
      });
    }
    
    await Product.bulkWrite(productUpdates);
    await sale.deleteOne();
    
    res.json({ message: 'Продажа была отменена, а товар возвращен.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/recent', protect, async (req, res) => {
  try {
    const recentSales = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(10)
      // .populate('product', 'name price')
      .populate('customer', 'name');

    res.json({
      success: true,
      count: recentSales.length,
      data: recentSales
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Sotuvlarni yuklashda xato' 
    });
  }
});


module.exports = router;
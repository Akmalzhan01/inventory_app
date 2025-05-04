const express = require('express');
const mongoose = require('mongoose');
// const { Sale } = require('../models/Sale');
// const { Product } = require('../models/Product');
// const { Customer } = require('../models/Customer');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/stats
// @desc    Asosiy statistikani olish

// Modelarni to'g'ri import qilish
const Product = mongoose.model('Product');
const Sale = mongoose.model('Sale');
const Customer = mongoose.model('Customer');
router.get('/', async (req, res) => {
  try {
    // Model mavjudligini tekshirish
    if (!Product || typeof Product.countDocuments !== 'function') {
      throw new Error('Product modeli toʻgʻri ishlamayapti');
    }
    if (!Sale || typeof Sale.countDocuments !== 'function') {
      throw new Error('Sale modeli toʻgʻri ishlamayapti');
    }
    if (!Customer || typeof Customer.countDocuments !== 'function') {
      throw new Error('Customer modeli toʻgʻri ishlamayapti');
    }

    // Parallel so'rovlar
    const [
      totalProducts, 
      totalSales, 
      revenueResult, 
      lowStockItems, 
      totalCustomers
    ] = await Promise.all([
      Product.countDocuments({}),
      Sale.countDocuments({}),
      Sale.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Product.countDocuments({ $expr: { $lte: ['$quantity', '$minQuantity'] } }),
      Customer.countDocuments({})
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalSales,
        totalRevenue: revenueResult[0]?.total || 0,
        lowStockItems,
        totalCustomers
      }
    });

  } catch (error) {
    console.error('Stats error:', {
      message: error.message,
      stack: error.stack,
      models: {
        Product: !!Product,
        Sale: !!Sale,
        Customer: !!Customer
      }
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
    });
  }
});

// @route   GET /api/stats/sales-by-month
// @desc    Oylik savdo statistikasi
router.get('/sales-by-month', async (req, res) => {
  try {
    const salesByMonth = await Sale.aggregate([
      {
        $group: {
          _id: { $month: '$saleDate' },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json(salesByMonth);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/stats/top-products
// @desc    Eng ko'p sotilgan tovarlar
router.get('/top-products', async (req, res) => {
  try {
    const topProducts = await Sale.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          sku: '$product.sku',
          totalSold: 1,
          totalRevenue: 1
        }
      }
    ]);
    
    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// router.get('/', protect, async (req, res) => {
//   try {
//     const [totalProducts, totalSales, lowStockItems, totalRevenue] = await Promise.all([
//       Product.countDocuments(),
//       Sale.countDocuments(),
//       Product.countDocuments({ quantity: { $lt: 10 } }),
//       Sale.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }])
//     ]);

//     res.json({
//       success: true,
//       data: {
//         totalProducts,
//         totalSales,
//         totalRevenue: totalRevenue[0]?.total || 0,
//         lowStockItems
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ 
//       success: false,
//       message: 'Statistika yuklashda xato' 
//     });
//   }
// });


module.exports = router;
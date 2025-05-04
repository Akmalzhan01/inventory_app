const express = require('express');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// @route   GET /api/customers
// @desc    Barcha mijozlarni olish
router.get('/', authMiddleware, async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/customers/:id
// @desc    Bitta mijozni olish
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    // Mijozning nasiya savdolari
    const creditSales = await Sale.find({ 
      customer: customer._id, 
      isCredit: true 
    }).select('total paidAmount saleDate');
    
    res.json({
      ...customer.toObject(),
      creditSales,
      totalDebt: creditSales.reduce((sum, sale) => sum + (sale.total - sale.paidAmount), 0)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/customers
// @desc    Yangi mijoz qo'shish
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, creditLimit } = req.body;
    
    const customer = await Customer.create({
      name,
      phone,
      address,
      creditLimit: creditLimit || 0
    });
    
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/customers/:id
// @desc    Mijoz ma'lumotlarini yangilash
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, phone, address, creditLimit } = req.body;
    
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    customer.name = name || customer.name;
    customer.phone = phone || customer.phone;
    customer.address = address || customer.address;
    
    // Faqat admin credit limitni o'zgartira oladi
    if (req.user.role === 'admin' && creditLimit !== undefined) {
      customer.creditLimit = creditLimit;
    }
    
    const updatedCustomer = await customer.save();
    res.json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Mijozni o'chirish (faqat admin uchun)
// router.delete('/:id', async (req, res) => {
//   try {
//     const customer = await Customer.findById(req.params.id);
//     if (!customer) {
//       return res.status(404).json({ message: 'Mijoz topilmadi' });
//     }
    
//     // Mijozda qarz borligini tekshirish
//     const hasDebt = await Sale.exists({ 
//       customer: customer._id, 
//       isCredit: true,
//       $expr: { $lt: ['$paidAmount', '$total'] }
//     });
    
//     if (hasDebt) {
//       return res.status(400).json({ message: 'Mijozda qarz bor, o\'chirib bo\'lmaydi' });
//     }
    
//     await customer.remove();
//     res.json({ message: 'Mijoz o\'chirildi' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });
// Express.js misoli
router.delete('/:id', async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
    if (!deletedCustomer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    res.json({ message: 'Mijoz o\'chirildi' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
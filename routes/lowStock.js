const express = require('express');
const {protect} = require("../middleware/authMiddleware")
const Product = require('../models/Product');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const lowStockProducts = await Product.find({quantity: { $lt: 10 }}).select('name quantity price category');

    res.json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});



module.exports = router;
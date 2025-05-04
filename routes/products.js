const express = require('express');
const Product = require('../models/Product');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/products
// @desc    Barcha tovarlarni olish
router.get('/', authMiddleware, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// @route   GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById({_id: id});
    if (!product) {
      return res.status(404).json({ message: 'Tovar topilmadi' });
    }
    res.status(200).json({
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: product.quantity,
        minQuantity: product.minQuantity,
        description: product.description,
        category: product.category?.name,
      }
    })


  } catch (error) {
    res.json(error.message)
  }
})


/
// @route   POST /api/products
// @desc    Yangi tovar qo'shish
router.post('/', async (req, res) => {
  try {
    const { name, sku, category, price, quantity, minQuantity, description } = req.body;

    // SKU tekshirish
    const productExists = await Product.findOne({ sku });
    if (productExists) {
      return res.status(400).json({ message: 'Bu SKU bilan tovar allaqachon mavjud' });
    }

    const product = await Product.create({
      name,
      sku,
      category,
      price,
      quantity,
      minQuantity,
      description
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Tovarni yangilash
router.put('/:id', async (req, res) => {
  try {
    const { name, category, price, quantity, minQuantity, description } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Tovar topilmadi' });
    }

    product.name = name || product.name;
    product.category = category || product.category;
    product.price = price || product.price;
    product.quantity = quantity || product.quantity;
    product.minQuantity = minQuantity || product.minQuantity;
    product.description = description || product.description;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Tovarni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Tovar topilmadi' });
    }

    await product.deleteOne();
    res.json({ message: 'Tovar o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






module.exports = router;
const express = require('express');
const router = express.Router();
const Borrow = require('../models/Borrow');

// Get all borrow records
router.get('/', async (req, res) => {
  try {
    const borrows = await Borrow.find().sort({ createdAt: -1 });
    res.json(borrows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new borrow record
router.post('/', async (req, res) => {
  const borrow = new Borrow({
    lenderName: req.body.lenderName,
    borrowDate: req.body.borrowDate,
    returnDate: req.body.returnDate,
    items: req.body.items
  });

  try {
    const newBorrow = await borrow.save();
    res.status(201).json(newBorrow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get single borrow record
router.get('/:id', async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id);
    if (!borrow) return res.status(404).json({ message: 'Borrow record not found' });
    res.json(borrow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update borrow record
router.put('/:id', async (req, res) => {
  try {
    const updatedBorrow = await Borrow.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          lenderName: req.body.lenderName,
          borrowDate: req.body.borrowDate,
          returnDate: req.body.returnDate,
          returned: req.body.returned,
          items: req.body.items
        }
      },
      { new: true }
    );
    res.json(updatedBorrow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mark as returned
router.patch('/:id/return', async (req, res) => {
  try {
    const updatedBorrow = await Borrow.findByIdAndUpdate(
      req.params.id,
      { $set: { returned: true, returnDate: new Date() } },
      { new: true }
    );
    res.json(updatedBorrow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add partial payment
router.patch('/:id/partial-payment', async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id);
    if (!borrow) return res.status(404).json({ message: 'Borrow record not found' });

    // Create payment object
    const payment = {
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      paymentDate: req.body.paymentDate,
      items: req.body.items
    };

    // Update item paid amounts
    for (const itemPayment of req.body.items) {
      const item = borrow.items.id(itemPayment.itemId);
      if (item) {
        item.paidAmount = (item.paidAmount || 0) + itemPayment.amount;
      }
    }

    // Add payment to payments array
    borrow.payments.push(payment);

    // Save the updated borrow record
    const updatedBorrow = await borrow.save();
    res.json(updatedBorrow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete borrow record
router.delete('/:id', async (req, res) => {
  try {
    await Borrow.findByIdAndDelete(req.params.id);
    res.json({ message: 'Borrow record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
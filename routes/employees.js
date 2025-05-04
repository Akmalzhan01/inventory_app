const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Yangi xodim qo'shish
router.post('/', async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Barcha xodimlarni olish
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xodimni ID bo'yicha olish
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Xodim topilmadi' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xodimni yangilash
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Xodimni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xodim o\'chirildi' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
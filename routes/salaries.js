const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Salary = require('../models/Salary');

// Yangi ish haqi qo'shish
router.post('/', async (req, res) => {
  try {
    const salary = new Salary({
      ...req.body,
      // createdBy: req.user.id
      
    });
    
    await salary.save();
    res.status(201).json(salary);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Oylik ish haqlarini olish
router.get('/:year/:month', async (req, res) => {
  try {
    const salaries = await Salary.find({
      year: req.params.year,
      month: req.params.month
    }).populate('employee', 'name position');
    
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ish haqlarini filtrlash
router.get('/', async (req, res) => {
  try {
    const { year, month, paymentMonth } = req.query;
    let query = {};
    
    if (year && year !== '') query.year = parseInt(year);
    if (month && month !== '') query.month = parseInt(month);
    if (paymentMonth && paymentMonth !== '') {
      const filterYear = year && year !== '' ? parseInt(year) : new Date().getFullYear();
      query.paymentDate = {
        $gte: new Date(filterYear, parseInt(paymentMonth) - 1, 1),
        $lt: new Date(filterYear, parseInt(paymentMonth), 0)
      };
    }
    
    const salaries = await Salary.find(query).populate('employee', 'name position');
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xodimning ish haqi tarixi
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const salaries = await Salary.find({
      employee: req.params.employeeId
    }).sort({ year: -1, month: -1 });
    
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ish haqini yangilash
router.put('/:id', async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } 
    );
    res.json(salary);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const salary = await Salary.findByIdAndDelete(req.params.id);
    if (!salary) return res.status(404).send("Ish haqi topilmadi");
    res.send(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})

module.exports = router;
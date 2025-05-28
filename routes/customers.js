const express = require('express')
const Customer = require('../models/Customer')
const Sale = require('../models/Sale')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

// @route   GET /api/customers
// @desc    Barcha mijozlarni olish
router.get('/', authMiddleware, async (req, res) => {
	try {
		const customers = await Customer.find().sort({ name: 1 })
		res.json(customers)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

// @route   GET /api/customers/:id
// @desc    Bitta mijozni olish
router.get('/:id', authMiddleware, async (req, res) => {
	try {
		const customer = await Customer.findById(req.params.id)
		if (!customer) {
			return res.status(404).json({ message: 'Mijoz topilmadi' })
		}

		// Mijozning nasiya savdolari
		const creditSales = await Sale.find({
			customer: customer._id,
			isCredit: true,
		}).select('total paidAmount saleDate')

		res.json({
			...customer.toObject(),
			creditSales,
			totalDebt: creditSales.reduce(
				(sum, sale) => sum + (sale.total - sale.paidAmount),
				0
			),
		})
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

// @route   POST /api/customers
// @desc    Yangi mijoz qo'shish
router.post('/', authMiddleware, async (req, res) => {
	try {
		const { name, phone, address, creditLimit } = req.body

		const customer = await Customer.create({
			name,
			phone,
			address,
			creditLimit: creditLimit || 0,
		})

		res.status(201).json(customer)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

// @route   PUT /api/customers/:id
// @desc    Mijoz ma'lumotlarini yangilash
router.put('/:id', authMiddleware, async (req, res) => {
	try {
		const { name, phone, address, creditLimit } = req.body

		const customer = await Customer.findById(req.params.id)
		if (!customer) {
			return res.status(404).json({ message: 'Mijoz topilmadi' })
		}

		customer.name = name || customer.name
		customer.phone = phone || customer.phone
		customer.address = address || customer.address

		// Faqat admin credit limitni o'zgartira oladi
		if (req.user.role === 'admin' && creditLimit !== undefined) {
			customer.creditLimit = creditLimit
		}

		const updatedCustomer = await customer.save()
		res.json(updatedCustomer)
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

router.post('/delete', async (req, res) => {
	const data = req.body
	try {
		const password = await User.findById(data.user._id)

		if (password) {
			const isMatch = await bcrypt.compare(data.pass, password.password)
			if (isMatch) {
				const product = await Customer.findById(data.id)
				if (!product) {
					return res.status(404).json({ message: 'Xaridor topilmadi' })
				}
				await product.deleteOne()
				res.json({ message: "Xaridor o'chirildi" })
			} else {
				return res.status(401).json({ success: false })
			}
		}
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

module.exports = router

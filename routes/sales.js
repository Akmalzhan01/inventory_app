const express = require('express')
const mongoose = require('mongoose')
const Product = require('../models/Product')
const Sale = require('../models/Sale')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const adminMiddleware = require('../middleware/admin')
const { protect } = require('../middleware/authMiddleware')
const User = require('../models/User')
const bcrypt = require('bcryptjs')

// @route   GET /api/sales
// @desc    Barcha sotuvlarni olish
router.get('/', async (req, res) => {
	try {
		const sales = await require('../models/Sale')
			.find()
			.populate('customer', 'name phone')
			.populate('seller', 'name')
			.populate('items.product', 'name sku price')
			.sort({ saleDate: -1 })
		res.json({ count: sales.length, sales })
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

router.post('/', async (req, res) => {
	try {
		const { customer, items, isCredit, paidAmount, seller } = req.body

		// Items mavjudligini tekshirish
		if (!items || !Array.isArray(items) || items.length === 0) {
			return res
				.status(400)
				.json({ message: 'Kamida 1 ta mahsulot kiritilishi kerak' })
		}

		// Tovarlarni tekshirish va narxni hisoblash
		const productUpdates = []
		let total = 0

		for (const item of items) {
			// Mahsulotni bazadan qidirish
			const product = await Product.findById(item.product)
			if (!product) {
				return res
					.status(404)
					.json({ message: `Tovar topilmadi ID: ${item.product}` })
			}

			// Miqdorni tekshirish
			if (product.quantity < item.quantity) {
				return res.status(400).json({
					message: `Yetarli miqdor mavjud emas: ${product.name}`,
					available: product.quantity,
					requested: item.quantity,
				})
			}

			// Yangilash uchun operatsiyani qo'shish
			productUpdates.push({
				updateOne: {
					filter: { _id: item.product },
					update: { $inc: { quantity: -item.quantity } },
				},
			})

			// Summani hisoblash
			total += (item.price || product.price) * item.quantity
		}

		// Nasiya to'lovini tekshirish
		if (isCredit && paidAmount > total) {
			return res.status(400).json({
				message: "To'lov summasi jami summadan katta",
				totalAmount: total,
				paidAmount: paidAmount,
			})
		}

		// Sotuvni yaratish
		const sale = await Sale.create({
			customer: customer || null,
			items: items.map(item => ({
				name: item.name,
				product: item.product,
				quantity: item.quantity,
				price: item.price || Product.findById(item.product).price,
			})),
			total,
			isCredit: isCredit || false,
			paidAmount: paidAmount || (isCredit ? 0 : total),
			seller,
		})

		// Tovarlar miqdorini yangilash
		if (productUpdates.length > 0) {
			await Product.bulkWrite(productUpdates)
		}

		res.status(201).json({
			success: true,
			data: sale,
		})
	} catch (error) {
		console.error('Sotuv yaratishda xato:', error)
		res.status(500).json({
			success: false,
			message: 'Server xatosi',
			error: error,
		})
	}
})

// @route   PUT /api/sales/:id/pay
// @desc    Nasiyani to'lash
router.put('/:id/pay', async (req, res) => {
	const session = await mongoose.startSession()
	session.startTransaction()

	try {
		const { amount, paymentMethod = 'cash', notes, receivedBy } = req.body

		// Validatsiya
		if (!amount || amount <= 0) {
			return res.status(400).json({
				success: false,
				message: "Noto'g'ri to'lov summasi",
			})
		}

		const sale = await Sale.findById(req.params.id).session(session)
		if (!sale) {
			return res.status(404).json({
				success: false,
				message: 'Sotuv topilmadi',
			})
		}

		if (!sale.isCredit) {
			return res.status(400).json({
				success: false,
				message: 'Bu sotuv nasiya emas',
			})
		}

		const remainingAmount = sale.total - sale.paidAmount
		if (amount > remainingAmount) {
			return res.status(400).json({
				success: false,
				message: "To'lov summasi qarz miqdoridan oshib ketdi",
				data: {
					maxAllowed: remainingAmount,
					remainingDebt: remainingAmount,
				},
			})
		}

		// Yangi to'lov yozuvini qo'shamiz
		const paymentRecord = {
			amount,
			paymentDate: new Date(),
			paymentMethod,
			receivedBy: receivedBy || req.user?.id, // Agar auth bo'lsa
			notes,
		}

		sale.paymentHistory.push(paymentRecord)
		sale.paidAmount += amount

		// Agar to'liq to'landi bo'lsa
		if (sale.paidAmount >= sale.total) {
			sale.isCredit = false
			sale.paymentStatus = 'paid'
		}

		await sale.save({ session })
		await session.commitTransaction()

		// To'lov haqida notification yuborish (agar kerak bo'lsa)
		// await sendPaymentNotification(sale, paymentRecord);

		res.json({
			success: true,
			data: {
				sale,
				paymentRecord,
				remainingDebt: sale.total - sale.paidAmount,
			},
		})
	} catch (error) {
		await session.abortTransaction()
		console.error("To'lov qilishda xato:", error)
		res.status(500).json({
			success: false,
			message: error.message,
		})
	} finally {
		session.endSession()
	}
})
// @desc    Mijozning to'lov tarixi
// @route   GET /api/sales/customer/:customerId/payments
router.get('/customer/:customerId/payments', async (req, res) => {
	try {
		const { startDate, endDate } = req.query

		const filter = {
			customer: req.params.customerId,
			isCredit: true,
			'paymentHistory.0': { $exists: true }, // Payment history bo'lganlar
		}

		// Sana filteri
		if (startDate || endDate) {
			filter['paymentHistory.paymentDate'] = {}
			if (startDate)
				filter['paymentHistory.paymentDate'].$gte = new Date(startDate)
			if (endDate) filter['paymentHistory.paymentDate'].$lte = new Date(endDate)
		}

		const sales = await Sale.find(filter)
			.populate('customer', 'name phone')
			.populate('paymentHistory.receivedBy', 'name')
			.sort({ 'paymentHistory.paymentDate': -1 })

		// To'lovlarni alohida arrayga yig'amiz
		const allPayments = sales.reduce((acc, sale) => {
			const salePayments = sale.paymentHistory.map(payment => ({
				saleId: sale._id,
				saleDate: sale.saleDate,
				totalAmount: sale.total,
				...payment.toObject(),
			}))
			return acc.concat(salePayments)
		}, [])

		res.json({
			success: true,
			count: allPayments.length,
			data: allPayments,
		})
	} catch (error) {
		console.error("To'lov tarixini olishda xato:", error)
		res.status(500).json({
			success: false,
			message: error.message,
		})
	}
})
// @route   DELETE /api/sales/delete
// @desc    Sotuvni bekor qilish (faqat admin uchun)
router.post('/delete', async (req, res) => {
	const data = req.body
	try {
		const password = await User.findById(data.user._id)
		if (password) {
			const isMatch = await bcrypt.compare(data.pass, password.password)
			if (isMatch) {
				const sale = await Sale.findById(data.saleId)
				if (!sale) {
					return res.status(404).json({ message: 'Tovar topilmadi' })
				}
				// Tovarlarni qaytarish
				const productUpdates = []
				for (const item of sale.items) {
					productUpdates.push({
						updateOne: {
							filter: { _id: item.product },
							update: { $inc: { quantity: item.quantity } },
						},
					})
				}

				await Product.bulkWrite(productUpdates)
				await sale.deleteOne()
				res.json({ message: "Tovar o'chirildi" })
			} else {
				return res.status(401).json({ success: false })
			}
		}

		res.json({ message: 'Продажа была отменена, а товар возвращен.' })
	} catch (error) {
		res.status(500).json({ message: error.message })
	}
})

router.get('/recent', protect, async (req, res) => {
	try {
		const recentSales = await Sale.find()
			.sort({ createdAt: -1 })
			.limit(10)
			// .populate('product', 'name price')
			.populate('customer', 'name')

		res.json({
			success: true,
			count: recentSales.length,
			data: recentSales,
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			success: false,
			message: 'Sotuvlarni yuklashda xato',
		})
	}
})

module.exports = router

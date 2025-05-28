const express = require('express')
const router = express.Router()
const Expend = require('../models/Expend')
const User = require('../models/User')
const bcrypt = require('bcryptjs')

router.post('/', async (req, res) => {
	const { name, price, date, category } = req.body
	try {
		const newExpend = new Expend({
			name,
			price,
			date,
			category,
		})
		await newExpend.save()
		res.status(201).json(newExpend)
	} catch (error) {
		res.status(500).json({ message: 'Server xatosi' })
	}
})

router.get('/', async (req, res) => {
	try {
		const expends = await Expend.find()
		res.status(200).json(expends)
	} catch (error) {
		res.status(500).json({ message: 'Server xatosi' })
	}
})

router.get('/:id', async (req, res) => {
	const { id } = req.params
	try {
		const expend = await Expend.findById(id)
		if (!expend) {
			return res.status(404).json({ message: 'Expend topilmadi' })
		}
		res.status(200).json(expend)
	} catch (error) {
		res.status(500).json({ message: 'Server xatosi' })
	}
})

router.put('/:id', async (req, res) => {
	const { id } = req.params
	const { name, price, date, category } = req.body
	try {
		const expend = await Expend.findByIdAndUpdate(
			id,
			{ name, price, date, category },
			{ new: true }
		)
		if (!expend) {
			return res.status(404).json({ message: 'Expend topilmadi' })
		}
		res.status(200).json(expend)
	} catch (error) {
		res.status(500).json({ message: 'Server xatosi' })
	}
})

router.post('/delete', async (req, res) => {
	const data = req.body
	try {
		const password = await User.findById(data.user._id)

		if (password) {
			const isMatch = await bcrypt.compare(data.pass, password.password)
			if (isMatch) {
				const expend = await Expend.findById(data.id)
				if (!expend) {
					return res.status(404).json({ message: 'Expend topilmadi' })
				}
				await expend.deleteOne()
				res.json({ message: "Expend o'chirildi" })
			} else {
				return res.status(401).json({ success: false })
			}
		}
	} catch (error) {
		res.status(500).json({ message: 'Server xatosi' })
	}
})

module.exports = router

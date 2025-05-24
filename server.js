require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

// Middleware
app.use(
	cors({
		origin: [
			'https://inventory-app-theta-two.vercel.app',
			'https://inventory-app-front.netlify.app',
			'http://localhost:5173',
		],
		credentials: true,
	})
)
app.use(morgan('dev'))
app.use(express.json())

const PORT = process.env.PORT || 5000
// MongoDB ulanish
mongoose
	.connect(process.env.MONGODB_URI, {
		serverSelectionTimeoutMS: 10000, // 10s timeout
	})
	.then(() => {
		console.log('MongoDB ga ulandi')
		app.listen(PORT, () => console.log(`Server ${PORT} portda ishga tushdi`))
	})
	.catch(err => console.log('MongoDB ulanish xatosi:', err))

// API route-lari
app.use('/api/auth', require('./routes/auth'))
app.use('/api/users', require('./routes/users'))
app.use('/api/products', require('./routes/products'))
app.use('/api/low-stock', require('./routes/lowStock'))
app.use('/api/sales', require('./routes/sales'))
app.use('/api/customers', require('./routes/customers'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/employees', require('./routes/employees'))
app.use('/api/salaries', require('./routes/salaries'))
app.use('/api/borrows', require('./routes/borrow'))
app.use('/api/statistic', require('./routes/statistic'))
app.use('/api/expend', require('./routes/expend'))

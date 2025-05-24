// const mongoose = require('mongoose');

// const SaleItemSchema = new mongoose.Schema({
//   product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//   quantity: { type: Number, required: true, min: 1 },
//   price: { type: Number, required: true, min: 0 }
// });

// const SaleSchema = new mongoose.Schema({
//   customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
//   items: [SaleItemSchema],
//   total: { type: Number, required: true, min: 0 },
//   isCredit: { type: Boolean, default: false },
//   paidAmount: { type: Number, default: 0 },
//   seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   saleDate: { type: Date, default: Date.now }
// });

// SaleSchema.virtual('remainingAmount').get(function() {
//   return this.total - this.paidAmount;
// });

// module.exports = mongoose.model('Sale', SaleSchema);

const mongoose = require('mongoose')
const Product = require('./Product')
const Customer = require('./Customer')
const User = require('./User')

const SaleItemSchema = new mongoose.Schema(
	{
		product: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
		},
		price: {
			type: Number,
			required: true,
			min: 0,
		},
		name: {
			// Cached product name for reporting
			type: String,
			required: true,
		},
	},
	{ _id: false }
)

const PaymentRecordSchema = new mongoose.Schema(
	{
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		paymentDate: {
			type: Date,
			default: Date.now,
		},
		paymentMethod: {
			type: String,
			enum: ['cash', 'card', 'transfer', 'other'],
			default: 'cash',
		},
		receivedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
		notes: String,
		reference: String, // Payment reference number
	},
	{ _id: false }
)

const SaleSchema = new mongoose.Schema(
	{
		customer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Customer',
		},
		items: [SaleItemSchema],
		total: {
			type: Number,
			required: true,
			min: 0,
		},
		discount: {
			type: Number,
			default: 0,
			min: 0,
		},
		tax: {
			type: Number,
			default: 0,
			min: 0,
		},
		grandTotal: {
			type: Number,
			required: true,
			min: 0,
		},
		isCredit: {
			type: Boolean,
			default: false,
		},
		paymentMethod: {
			type: String,
			enum: ['cash', 'card', 'transfer', 'other'],
			default: 'cash',
		},
		paidAmount: {
			type: Number,
			default: 0,
			min: 0,
		},
		paymentHistory: [PaymentRecordSchema],
		seller: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		saleDate: {
			type: Date,
			default: Date.now,
		},
		notes: String,
		status: {
			type: String,
			enum: ['completed', 'pending', 'cancelled', 'refunded'],
			default: 'completed',
		},
		invoiceNumber: String,
		shippingInfo: {
			address: String,
			city: String,
			country: String,
			trackingNumber: String,
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	}
)

// Virtuals
SaleSchema.virtual('remainingAmount').get(function () {
	return this.isCredit ? this.grandTotal - this.paidAmount : 0
})

SaleSchema.virtual('paymentStatus').get(function () {
	if (!this.isCredit) return 'paid'
	if (this.paidAmount === 0) return 'unpaid'
	if (this.paidAmount >= this.grandTotal) return 'paid'
	return 'partial'
})

// Pre-save hooks
SaleSchema.pre('save', async function (next) {
	// Calculate totals
	const subtotal = this.items.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0
	)
	this.total = subtotal - this.discount
	this.grandTotal = this.total + this.tax

	// Cache product names
	for (const item of this.items) {
		if (!item.name) {
			const product = await Product.findById(item.product)
			if (product) item.name = product.name
		}
	}

	// For credit sales, ensure paidAmount doesn't exceed total
	if (this.isCredit && this.paidAmount > this.grandTotal) {
		throw new Error('Paid amount cannot exceed grand total')
	}

	// For non-credit sales, mark as fully paid
	if (!this.isCredit) {
		this.paidAmount = this.grandTotal
	}

	// Add initial payment record if payment was made
	if (this.paidAmount > 0 && this.paymentHistory.length === 0) {
		this.paymentHistory.push({
			amount: this.paidAmount,
			paymentMethod: this.paymentMethod,
			receivedBy: this.seller,
			notes: 'Initial payment',
		})
	}

	next()
})

// Post-save hook to update product quantities
SaleSchema.post('save', async function (doc) {
	if (doc.status === 'completed') {
		const bulkOps = doc.items.map(item => ({
			updateOne: {
				filter: { _id: item.product },
				update: { $inc: { quantity: -item.quantity } },
			},
		}))

		if (bulkOps.length > 0) {
			await Product.bulkWrite(bulkOps)
		}
	}
})

// Static methods
SaleSchema.statics.findByCustomer = function (customerId) {
	return this.find({ customer: customerId })
		.populate('customer', 'name phone email')
		.populate('seller', 'name')
		.populate('items.product', 'name sku price')
		.sort({ saleDate: -1 })
}

SaleSchema.statics.getSalesSummary = async function (filter = {}) {
	return this.aggregate([
		{ $match: filter },
		{
			$group: {
				_id: null,
				totalSales: { $sum: '$grandTotal' },
				totalPaid: { $sum: '$paidAmount' },
				totalCredit: {
					$sum: {
						$cond: [{ $eq: ['$isCredit', true] }, '$grandTotal', 0],
					},
				},
				totalCreditPaid: {
					$sum: {
						$cond: [{ $eq: ['$isCredit', true] }, '$paidAmount', 0],
					},
				},
				count: { $sum: 1 },
			},
		},
	])
}

// Instance method for adding payments
SaleSchema.methods.addPayment = async function (paymentData) {
	if (!this.isCredit) {
		throw new Error('Only credit sales can receive additional payments')
	}

	if (this.paidAmount >= this.grandTotal) {
		throw new Error('Sale is already fully paid')
	}

	const remaining = this.grandTotal - this.paidAmount
	const paymentAmount = Math.min(remaining, paymentData.amount)

	this.paymentHistory.push({
		amount: paymentAmount,
		paymentMethod: paymentData.paymentMethod || 'cash',
		receivedBy: paymentData.receivedBy,
		notes: paymentData.notes,
		reference: paymentData.reference,
	})

	this.paidAmount += paymentAmount

	// If fully paid, update status
	if (this.paidAmount >= this.grandTotal) {
		this.isCredit = false
	}

	return this.save()
}

// Indexes
SaleSchema.index({ saleDate: -1 })
SaleSchema.index({ customer: 1 })
SaleSchema.index({ seller: 1 })
SaleSchema.index({ 'items.product': 1 })
SaleSchema.index({ status: 1 })
SaleSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Sale', SaleSchema)

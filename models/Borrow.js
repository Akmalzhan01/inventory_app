const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0 }
});

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true, enum: ['cash', 'card', 'transfer'] },
  paymentDate: { type: Date, required: true, default: Date.now },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    amount: { type: Number, required: true }
  }]
});

const borrowSchema = new mongoose.Schema({
  lenderName: { type: String, required: true },
  borrowDate: { type: Date, required: true, default: Date.now },
  returnDate: { type: Date },
  returned: { type: Boolean, default: false },
  items: [itemSchema],
  payments: [paymentSchema],
  paidAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate total amount before saving
borrowSchema.pre('save', function(next) {
  this.paidAmount = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  this.updatedAt = Date.now();
  next();
});

// Add virtual for total amount
borrowSchema.virtual('totalAmount').get(function() {
  return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Add virtual for remaining amount
borrowSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

module.exports = mongoose.model('Borrow', borrowSchema);
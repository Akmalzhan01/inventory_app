const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }
});

const SaleSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [SaleItemSchema],
  total: { type: Number, required: true, min: 0 },
  isCredit: { type: Boolean, default: false },
  paidAmount: { type: Number, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saleDate: { type: Date, default: Date.now }
});


SaleSchema.virtual('remainingAmount').get(function() {
  return this.total - this.paidAmount;
});

module.exports = mongoose.model('Sale', SaleSchema);
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mijoz ismi kiritilishi shart'],
    trim: true,
    maxlength: [50, 'Mijoz ismi 50 ta belgidan oshmasligi kerak']
  },
  phone: {
    type: String,
    required: [true, 'Telefon raqami kiritilishi shart'],
    trim: true,
    unique: true,
    match: [/^\+?[0-9]{9,15}$/, 'Iltimos, to\'g\'ri telefon raqamini kiriting']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [255, 'Manzil 255 ta belgidan oshmasligi kerak']
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Kredit limiti manfiy bo\'lishi mumkin emas']
  },
  currentDebt: {
    type: Number,
    default: 0,
    min: [0, 'Qarz miqdori manfiy bo\'lishi mumkin emas']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Izohlar 500 ta belgidan oshmasligi kerak']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  }
});

// Yangilangan sanani avtomatik yangilash
CustomerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Mijoz bilan bog'liq sotuvlarni olish uchun virtual maydon
CustomerSchema.virtual('sales', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'customer',
  justOne: false
});

// Mijozni o'chirishdan oldin tekshirish
CustomerSchema.pre('remove', async function(next) {
  const Sale = mongoose.model('Sale');
  const hasSales = await Sale.exists({ customer: this._id });
  
  if (hasSales) {
    throw new Error('Bu mijoz bilan bog\'liq sotuvlar mavjud. Avval sotuvlarni o\'chiring.');
  }
  
  next();
});

// Qoldiq kreditni hisoblash uchun virtual maydon
CustomerSchema.virtual('availableCredit').get(function() {
  return Math.max(0, this.creditLimit - this.currentDebt);
});

// JSON ga aylantirilganda virtual maydonlarni qo'shish
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Customer', CustomerSchema);
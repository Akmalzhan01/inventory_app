const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  employee: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      // required: true
    },
    firstName: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    }
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  bonus: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    // required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Avtomatik hisoblash
SalarySchema.pre('save', function(next) {
  this.netSalary = this.amount + this.bonus - this.deductions;
  next();
});

module.exports = mongoose.model('Salary', SalarySchema);
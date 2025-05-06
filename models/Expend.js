const mongoose = require('mongoose');

const ExpendSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  category: {
    type: String,
    required: true,
  },
})

module.exports = mongoose.model('Expend', ExpendSchema);
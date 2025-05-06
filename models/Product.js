const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  sku: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  category: { 
    type: String, 
    default: "Хозтовар",
    required: true, 
    trim: true 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  minQuantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  description: { 
    type: String, 
    trim: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Product', ProductSchema);
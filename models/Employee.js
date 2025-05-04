const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["active", "on_leave", "terminated"]
  },
  address: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
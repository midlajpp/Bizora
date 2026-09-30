const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    rate: {
      type: Number,
      required: [true, 'Service rate is required'],
      min: [0, 'Rate cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Service', serviceSchema);

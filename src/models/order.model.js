const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    image: {
      type: String,
      required: true,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (items) => items.length > 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentReceipt: {
      url: {
        type: String,
        trim: true,
      },
      publicId: {
        type: String,
        select: false,
      },
      uploadedAt: {
        type: Date,
      },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'submitted', 'paid'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

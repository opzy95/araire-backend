const mongoose = require('mongoose');
const Cart = require('../models/cart.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const cloudinaryService = require('./cloudinary.service');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function validateContactDetails(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('Phone number and delivery address are required');
  }

  const { phoneNumber, deliveryAddress } = input;
  if (typeof phoneNumber !== 'string' || !phoneNumber.trim() || phoneNumber.trim().length > 30) {
    throw badRequest('phoneNumber must be a non-empty string of at most 30 characters');
  }
  if (
    typeof deliveryAddress !== 'string'
    || !deliveryAddress.trim()
    || deliveryAddress.trim().length > 1000
  ) {
    throw badRequest('deliveryAddress must be a non-empty string of at most 1000 characters');
  }

  return {
    phoneNumber: phoneNumber.trim(),
    deliveryAddress: deliveryAddress.trim(),
  };
}

function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function validateOrderId(orderId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw badRequest('Invalid order ID');
  }
}

function publicOrder(order) {
  const result = order.toObject ? order.toObject() : { ...order };
  if (result.paymentReceipt) {
    delete result.paymentReceipt.publicId;
    if (!result.paymentReceipt.url) {
      delete result.paymentReceipt;
    }
  }
  return result;
}

async function deleteReceiptImage(publicId) {
  try {
    await cloudinaryService.deleteImage(publicId);
  } catch (error) {
    console.error('Failed to delete payment receipt image:', error.message);
  }
}

async function createForUser(userId, input, receiptFile) {
  const { phoneNumber, deliveryAddress } = validateContactDetails(input);
  const [cart, user] = await Promise.all([
    Cart.findOne({ userId }).lean(),
    User.findById(userId).select('_id'),
  ]);

  if (!user) {
    throw notFound('User not found');
  }
  if (!cart || cart.items.length === 0) {
    throw badRequest('Your cart is empty');
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ id: { $in: productIds } }).lean();
  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingProduct = cart.items.find((item) => !productsById.has(item.productId));
  if (missingProduct) {
    throw conflict('A product in your cart is no longer available. Update your cart before ordering.');
  }

  const items = cart.items.map(({ productId, quantity }) => {
    const product = productsById.get(productId);
    const lineTotal = roundCurrency(product.price * quantity);
    return {
      productId,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity,
      image: product.image,
      lineTotal,
    };
  });
  const total = roundCurrency(items.reduce((sum, item) => sum + item.lineTotal, 0));

  const receipt = receiptFile ? await cloudinaryService.uploadPaymentReceipt(receiptFile) : null;
  let order;
  try {
    order = await Order.create({
      userId,
      phoneNumber,
      deliveryAddress,
      items,
      total,
      ...(receipt
        ? {
          paymentReceipt: {
            url: receipt.url,
            publicId: receipt.publicId,
            uploadedAt: new Date(),
          },
          paymentStatus: 'submitted',
        }
        : {}),
    });
  } catch (error) {
    if (receipt) {
      await deleteReceiptImage(receipt.publicId);
    }
    throw error;
  }

  await Cart.updateOne(
    {
      userId,
      items: cart.items.map(({ productId, quantity }) => ({ productId, quantity })),
    },
    { $set: { items: [] } }
  );

  return publicOrder(order);
}

async function submitPayment(userId, rawOrderId, receiptFile) {
  validateOrderId(rawOrderId);
  const existingOrder = await Order.findOne({ _id: rawOrderId, userId })
    .select('+paymentReceipt.publicId');
  if (!existingOrder) {
    throw notFound('Order not found');
  }
  if (existingOrder.paymentStatus === 'paid') {
    throw conflict('This order has already been marked as paid');
  }

  const receipt = receiptFile
    ? await cloudinaryService.uploadPaymentReceipt(receiptFile)
    : null;
  const update = { paymentStatus: 'submitted' };
  if (receipt) {
    update.paymentReceipt = {
      url: receipt.url,
      publicId: receipt.publicId,
      uploadedAt: new Date(),
    };
  }

  let order;
  try {
    order = await Order.findOneAndUpdate(
      { _id: rawOrderId, userId, paymentStatus: { $ne: 'paid' } },
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    );
  } catch (error) {
    if (receipt) {
      await deleteReceiptImage(receipt.publicId);
    }
    throw error;
  }

  if (!order) {
    if (receipt) {
      await deleteReceiptImage(receipt.publicId);
    }
    const currentOrder = await Order.findOne({ _id: rawOrderId, userId }).select('paymentStatus');
    if (!currentOrder) {
      throw notFound('Order not found');
    }
    throw conflict('This order has already been marked as paid');
  }

  if (receipt && existingOrder.paymentReceipt?.publicId) {
    await deleteReceiptImage(existingOrder.paymentReceipt.publicId);
  }
  return publicOrder(order);
}

async function markPaymentPaid(rawOrderId) {
  validateOrderId(rawOrderId);
  const order = await Order.findOneAndUpdate(
    { _id: rawOrderId, paymentStatus: { $ne: 'paid' } },
    { $set: { paymentStatus: 'paid' } },
    { returnDocument: 'after', runValidators: true }
  );
  if (!order) {
    const existingOrder = await Order.exists({ _id: rawOrderId });
    if (!existingOrder) {
      throw notFound('Order not found');
    }
    throw conflict('This order has already been marked as paid');
  }
  return publicOrder(order);
}

async function listAll() {
  return Order.find()
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .lean();
}

async function listForUser(userId) {
  return Order.find({ userId })
    .select('-paymentReceipt.publicId')
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = { createForUser, submitPayment, markPaymentPaid, listAll, listForUser };

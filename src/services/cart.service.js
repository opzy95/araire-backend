const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function validateProductId(productId) {
  if (typeof productId !== 'string' || !productId.trim()) {
    throw badRequest('productId must be a non-empty string');
  }
  return productId.trim();
}

function validateQuantity(quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw badRequest('quantity must be a positive integer');
  }
  return quantity;
}

function publicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    image: product.image,
    rating: product.rating,
  };
}

async function ensureCart(userId) {
  try {
    await Cart.updateOne(
      { userId },
      { $setOnInsert: { userId, items: [] } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }
}

async function getCart(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  if (!cart || cart.items.length === 0) {
    return { items: [], totalItems: 0, subtotal: 0 };
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ id: { $in: productIds } }).lean();
  const productsById = new Map(products.map((product) => [product.id, product]));
  const items = cart.items.flatMap((item) => {
    const product = productsById.get(item.productId);
    return product ? [{ product: publicProduct(product), quantity: item.quantity }] : [];
  });
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = Math.round(
    items.reduce((total, item) => total + item.product.price * item.quantity, 0) * 100
  ) / 100;

  return { items, totalItems, subtotal };
}

async function addItem(userId, rawProductId, rawQuantity = 1) {
  const productId = validateProductId(rawProductId);
  const quantity = validateQuantity(rawQuantity);
  const product = await Product.findOne({ id: productId }).select('id');
  if (!product) {
    throw notFound('Product not found');
  }

  await ensureCart(userId);
  const increment = await Cart.updateOne(
    { userId, 'items.productId': productId },
    { $inc: { 'items.$.quantity': quantity } }
  );

  if (increment.matchedCount === 0) {
    const insertion = await Cart.updateOne(
      { userId, 'items.productId': { $ne: productId } },
      { $push: { items: { productId, quantity } } }
    );
    if (insertion.matchedCount === 0) {
      await Cart.updateOne(
        { userId, 'items.productId': productId },
        { $inc: { 'items.$.quantity': quantity } }
      );
    }
  }

  return getCart(userId);
}

async function setItemQuantity(userId, rawProductId, rawQuantity) {
  const productId = validateProductId(rawProductId);
  const quantity = validateQuantity(rawQuantity);
  const result = await Cart.updateOne(
    { userId, 'items.productId': productId },
    { $set: { 'items.$.quantity': quantity } }
  );

  if (result.matchedCount === 0) {
    throw notFound('Cart item not found');
  }
  return getCart(userId);
}

async function removeItem(userId, rawProductId) {
  const productId = validateProductId(rawProductId);
  const result = await Cart.updateOne(
    { userId, 'items.productId': productId },
    { $pull: { items: { productId } } }
  );

  if (result.matchedCount === 0 || result.modifiedCount === 0) {
    throw notFound('Cart item not found');
  }
  return getCart(userId);
}

async function clearCart(userId) {
  await Cart.updateOne({ userId }, { $set: { items: [] } });
  return getCart(userId);
}

module.exports = { getCart, addItem, setItemQuantity, removeItem, clearCart };

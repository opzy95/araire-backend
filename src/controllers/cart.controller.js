const cartService = require('../services/cart.service');

async function get(req, res) {
  const cart = await cartService.getCart(req.user.id);
  res.json({ cart });
}

async function addItem(req, res) {
  const cart = await cartService.addItem(
    req.user.id,
    req.body?.productId,
    req.body?.quantity
  );
  res.json({ cart });
}

async function setItemQuantity(req, res) {
  const cart = await cartService.setItemQuantity(
    req.user.id,
    req.params.productId,
    req.body?.quantity
  );
  res.json({ cart });
}

async function removeItem(req, res) {
  const cart = await cartService.removeItem(req.user.id, req.params.productId);
  res.json({ cart });
}

async function clear(req, res) {
  const cart = await cartService.clearCart(req.user.id);
  res.json({ cart });
}

module.exports = { get, addItem, setItemQuantity, removeItem, clear };

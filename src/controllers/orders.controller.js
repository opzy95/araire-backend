const ordersService = require('../services/orders.service');

async function create(req, res) {
  const order = await ordersService.createForUser(req.user.id, req.body, req.file);
  res.status(201).json({ order });
}

async function submitPayment(req, res) {
  const order = await ordersService.submitPayment(req.user.id, req.params.orderId, req.file);
  res.json({ order });
}

async function markPaymentPaid(req, res) {
  const order = await ordersService.markPaymentPaid(req.params.orderId);
  res.json({ order });
}

async function listAll(req, res) {
  const orders = await ordersService.listAll();
  res.json({ orders });
}

module.exports = { create, submitPayment, markPaymentPaid, listAll };

const productsService = require('../services/products.service');

async function list(req, res) {
  const products = await productsService.list();
  res.json({ products });
}

async function getById(req, res) {
  const product = await productsService.getById(req.params.id);
  res.json({ product });
}

async function create(req, res) {
  const product = await productsService.create(req.body, req.file);
  res.status(201).json({ product });
}

async function update(req, res) {
  const product = await productsService.update(req.params.id, req.body, req.file);
  res.json({ product });
}

async function remove(req, res) {
  await productsService.remove(req.params.id);
  res.status(204).end();
}

module.exports = { list, getById, create, update, remove };
const { randomUUID } = require('crypto');
const Product = require('../models/product.model');
const cloudinaryService = require('./cloudinary.service');

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

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function notFound() {
  const error = new Error('Product not found');
  error.status = 404;
  return error;
}

function validateFields(fields, requiredFields = []) {
  for (const field of requiredFields) {
    if (fields[field] === undefined) {
      throw badRequest(`${field} is required`);
    }
  }

  for (const field of ['name', 'category', 'image']) {
    if (fields[field] !== undefined && (typeof fields[field] !== 'string' || !fields[field].trim())) {
      throw badRequest(`${field} must be a non-empty string`);
    }
  }

  for (const field of ['price', 'rating']) {
    if (fields[field] !== undefined && (typeof fields[field] !== 'number' || !Number.isFinite(fields[field]))) {
      throw badRequest(`${field} must be a number`);
    }
  }
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('A product object is required');
  }

  const fields = {};
  for (const field of ['name', 'price', 'category', 'image', 'rating']) {
    if (Object.hasOwn(input, field)) {
      fields[field] = ['price', 'rating'].includes(field) && typeof input[field] === 'string' && input[field].trim()
        ? Number(input[field])
        : input[field];
    }
  }
  return fields;
}

async function list() {
  const products = await Product.find().sort({ createdAt: -1 });
  return products.map(publicProduct);
}

async function getById(id) {
  const product = await Product.findOne({ id });
  if (!product) {
    throw notFound();
  }
  return publicProduct(product);
}

async function create(input, imageFile) {
  const fields = normalizeInput(input);
  delete fields.image;
  validateFields(fields, ['name', 'price', 'category']);
  if (!imageFile) {
    throw badRequest('An image file is required in the image field');
  }
  if (input.id !== undefined && (typeof input.id !== 'string' || !input.id.trim())) {
    throw badRequest('id must be a non-empty string');
  }

  const uploadedImage = await cloudinaryService.uploadImage(imageFile);
  try {
    const product = await Product.create({
      ...fields,
      image: uploadedImage.url,
      imagePublicId: uploadedImage.publicId,
      id: input.id?.trim() || randomUUID(),
    });
    return publicProduct(product);
  } catch (error) {
    await cloudinaryService.deleteImage(uploadedImage.publicId).catch(() => {});
    if (error.code === 11000) {
      const conflict = new Error('A product with this id already exists');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

async function update(id, input, imageFile) {
  const fields = normalizeInput(input);
  delete fields.image;
  if (Object.keys(fields).length === 0 && !imageFile) {
    throw badRequest('At least one product field is required');
  }
  validateFields(fields);

  const existingProduct = await Product.findOne({ id }).select('+imagePublicId');
  if (!existingProduct) {
    throw notFound();
  }

  const uploadedImage = imageFile ? await cloudinaryService.uploadImage(imageFile) : null;
  if (uploadedImage) {
    fields.image = uploadedImage.url;
    fields.imagePublicId = uploadedImage.publicId;
  }

  let updatedProduct;
  try {
    updatedProduct = await Product.findOneAndUpdate({ id }, fields, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!updatedProduct) {
      throw notFound();
    }
  } catch (error) {
    if (uploadedImage) {
      await cloudinaryService.deleteImage(uploadedImage.publicId).catch(() => {});
    }
    if (error.code === 11000) {
      const conflict = new Error('A product with this id already exists');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }

  if (uploadedImage && existingProduct.imagePublicId) {
    await cloudinaryService.deleteImage(existingProduct.imagePublicId).catch(() => {});
  }
  return publicProduct(updatedProduct);
}

async function remove(id) {
  const product = await Product.findOneAndDelete({ id }).select('+imagePublicId');
  if (!product) {
    throw notFound();
  }
  if (product.imagePublicId) {
    await cloudinaryService.deleteImage(product.imagePublicId).catch(() => {});
  }
}

module.exports = { list, getById, create, update, remove };
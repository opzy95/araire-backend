const authService = require('../services/auth.service');

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

async function requestPasswordReset(req, res) {
  const result = await authService.requestPasswordReset(req.body);
  res.json(result);
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  res.json(result);
}

module.exports = { register, login, requestPasswordReset, resetPassword };
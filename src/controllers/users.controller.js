const usersService = require('../services/users.service');

async function getMe(req, res) {
  const user = await usersService.getById(req.user.id);
  res.json({ user });
}

async function updateMe(req, res) {
  const user = await usersService.updateById(req.user.id, req.body);
  res.json({ user });
}

module.exports = { getMe, updateMe };
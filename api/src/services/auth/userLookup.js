const repo = require("../../db/repository");

async function getUserByEmail(email) {
  return repo.getUserByEmail(email);
}

async function getUserById(id) {
  return repo.getUserById(id);
}

module.exports = {
  getUserByEmail,
  getUserById,
};

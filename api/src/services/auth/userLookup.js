const repo = require("../../db/repository");

async function getUserByEmail(email) {
  return repo.getUserByEmail(email);
}

async function getUserByIdentifier(identifier) {
  return repo.getUserByIdentifier(identifier);
}

async function getUserByUsername(username) {
  return repo.getUserByUsername(username);
}

async function getUserById(id) {
  return repo.getUserById(id);
}

module.exports = {
  getUserByEmail,
  getUserByIdentifier,
  getUserByUsername,
  getUserById,
};

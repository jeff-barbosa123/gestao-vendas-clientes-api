// Ensure tests outside the workspace can resolve dev dependencies from api/node_modules
const path = require('path');
const Module = require('module');

const apiNodeModules = path.join(__dirname, '..', 'node_modules');
process.env.NODE_PATH = [apiNodeModules, process.env.NODE_PATH || '']
  .filter(Boolean)
  .join(path.delimiter);
Module._initPaths();

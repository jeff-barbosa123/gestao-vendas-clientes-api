const customersService = require("../services/customersService");
const { parsePagination, validatePagination } = require("../utils/pagination");

async function list(req, res, next) {
  try {
    // Valida parâmetros de paginação
    const validationError = validatePagination(req.query);
    if (validationError) {
      const err = new Error(validationError.message);
      err.status = validationError.status;
      err.code = validationError.code;
      return next(err);
    }

    // Parse paginação (opcional - se não fornecido, retorna todos)
    const pagination = req.query.page || req.query.limit
      ? parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 })
      : null;

    // Parse filtros
    const filters = {
      type: req.query.filter || req.query.type, // all, birthdays, loyal, new, old
      search: req.query.search || req.query.q,
      sortBy: req.query.sortBy || req.query.sort, // name, name_desc, spent
      createdFrom: req.query.createdFrom || req.query.created_from,
      createdTo: req.query.createdTo || req.query.created_to,
    };

    // Remove undefined/null values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
        delete filters[key];
      }
    });

    const result = await customersService.list(req.user, pagination, filters);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await customersService.getById(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await customersService.create(req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function update(req, res, next) {
  try {
    res.json(await customersService.update(req.params.id, req.body, req.user));
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await customersService.remove(req.params.id, req.user));
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getById, create, update, remove };

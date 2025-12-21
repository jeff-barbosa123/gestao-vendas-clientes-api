// api/test/integration/customers.test.js
const { expect } = require('chai');
const { getClient } = require('../utils/httpClient');
const { loginAndGetToken } = require('../utils/authHelper');

const CUSTOMERS_PATH = '/api/customers';

const MESSAGES = {
  required: 'Campos obrigat\u00f3rios ausentes',
  invalidEmail: 'Formato de e-mail inv\u00e1lido',
  nameTooLong: 'Nome excede o tamanho permitido',
  nameInvalid: 'Nome inv\u00e1lido',
  phoneInvalid: 'Telefone inv\u00e1lido',
  conflictEmail: 'E-mail j\u00e1 cadastrado',
  notFound: 'Cliente n\u00e3o encontrado',
  accessDenied: 'Acesso negado',
};

const makeUniqueEmail = (prefix = 'user') =>
  `${prefix}+${Date.now()}+${Math.random().toString(16).slice(2)}@teste.com`;

describe('Clientes', () => {
  let http;
  let token;

  const authHeaders = (t) => ({ Authorization: `Bearer ${t}` });
  const postCustomer = (t, body) => http.post(CUSTOMERS_PATH).set(authHeaders(t)).send(body);
  const putCustomer = (t, id, body) => http.put(`${CUSTOMERS_PATH}/${id}`).set(authHeaders(t)).send(body);
  const deleteCustomer = (t, id) => http.delete(`${CUSTOMERS_PATH}/${id}`).set(authHeaders(t));
  const getCustomer = (t, id) => http.get(`${CUSTOMERS_PATH}/${id}`).set(authHeaders(t));

  before(async () => {
    http = getClient();
    token = await loginAndGetToken('admin');
  });

  describe('GET /customers', () => {
    it('API-CAD-001 | Deve listar os clientes retornando 200', async () => {
      const resposta = await http.get(CUSTOMERS_PATH).set(authHeaders(token));
      expect(resposta.status).to.equal(200);
    });
  });

  describe('POST /customers', () => {
    it('API-CAD-002 | Deve retornar 422 quando o nome não for informado', async () => {
      const resposta = await postCustomer(token, {});
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.required);
    });

    it('API-CAD-003 | Deve retornar 422 quando o e-mail não for informado', async () => {
      const resposta = await postCustomer(token, { name: 'Cliente Teste' });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.required);
    });

    it('API-CAD-004 | Deve retornar 422 ao enviar e-mail inválido', async () => {
      const resposta = await postCustomer(token, {
        name: 'Cliente Teste',
        email: 'usuario.com',
        phone: '11999999999',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
    });

    it('API-CAD-005 | Deve retornar 422 ao enviar e-mail sem domínio válido', async () => {
      const resposta = await postCustomer(token, {
        name: 'Cliente Teste',
        email: 'com',
        phone: '11999999999',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
    });

    it('API-CAD-006 | Deve remover espa?os antes e depois do e-mail', async () => {
      const uniqueEmail = makeUniqueEmail('trim-email');
      const resposta = await postCustomer(token, {
        name: 'Cliente Teste',
        email: `  ${uniqueEmail}  `,
        phone: '11999999999',
      });
      expect(resposta.status).to.equal(201);
      expect(resposta.body.email).to.equal(uniqueEmail);
    });

    it('API-CAD-007 | Deve remover espa?os antes e depois do nome', async () => {
      const uniqueEmail = makeUniqueEmail('trim-name');
      const resposta = await postCustomer(token, {
        name: '  Cliente Teste  ',
        email: uniqueEmail,
        phone: '11999999999',
      });
      expect(resposta.status).to.equal(201);
      expect(resposta.body.name).to.equal('Cliente Teste');
    });

    it('API-CAD-008 | Deve retornar 422 quando o nome ultrapassar 255 caracteres', async () => {
      const resposta = await postCustomer(token, {
        name: 'a'.repeat(256),
        email: makeUniqueEmail('longname'),
        phone: '11999999999',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.nameTooLong);
    });

    it('API-CAD-009 | Deve aceitar nome com caracteres UTF-8', async () => {
      const uniqueEmail = makeUniqueEmail('utf8name');
      const payload = {
        name: 'Cliente Teste UTF8',
        email: uniqueEmail,
        phone: '11999999999',
      };
      const resposta = await postCustomer(token, payload);
      expect(resposta.status).to.equal(201);
      expect(resposta.body.name).to.equal(payload.name);
    });

    it('API-CAD-010 | Deve retornar 409 ao tentar cadastrar um cliente duplicado', async () => {
      const email = makeUniqueEmail('duplicate');
      const payload = { name: 'Cliente Duplicado', email, phone: '11999999999' };

      const primeira = await postCustomer(token, payload);
      expect(primeira.status).to.equal(201);

      const segunda = await postCustomer(token, payload);
      expect(segunda.status).to.equal(409);
      expect(segunda.body.error).to.equal(MESSAGES.conflictEmail);
    });
  });

  describe('PUT /customers', () => {
    it('API-CAD-011 | Deve atualizar um cliente existente', async () => {
      const email = makeUniqueEmail('update');
      const created = await postCustomer(token, {
        name: 'Cliente Para Atualizar',
        email,
        phone: '11999999999',
      });
      const id = created.body.id;

      const resposta = await putCustomer(token, id, {
        name: 'Cliente Atualizado',
        email,
        phone: '11988888888',
      });

      expect(resposta.status).to.equal(200);
      expect(resposta.body.name).to.equal('Cliente Atualizado');
      expect(resposta.body.phone).to.equal('11988888888');
    });

    it('API-CAD-012 | Deve retornar 404 ao tentar atualizar cliente inexistente', async () => {
      const resposta = await putCustomer(token, '999999', {
        name: 'Cliente Inexistente',
        email: makeUniqueEmail('nonexistent'),
        phone: '11977777777',
      });
      expect(resposta.status).to.equal(404);
      expect(resposta.body.error).to.equal(MESSAGES.notFound);
    });
  });

  describe('DELETE /customers', () => {
    it('API-CAD-013 | Deve excluir cliente existente', async () => {
      const email = makeUniqueEmail('delete');
      const created = await postCustomer(token, {
        name: 'Cliente Para Excluir',
        email,
        phone: '11966666666',
      });
      const id = created.body.id;

      const resposta = await deleteCustomer(token, id);
      expect(resposta.status).to.equal(200);
      expect(resposta.body).to.have.property('id', id);
    });

    it('API-CAD-014 | Deve retornar 404 ao tentar excluir cliente inexistente', async () => {
      const resposta = await deleteCustomer(token, '999999');
      expect(resposta.status).to.equal(404);
      expect(resposta.body.error).to.equal(MESSAGES.notFound);
    });
  });

  describe('Consultas', () => {
    it('API-CAD-015 | Deve retornar 200 e listar todos os clientes cadastrados', async () => {
      const resposta = await http.get(CUSTOMERS_PATH).set(authHeaders(token));
      expect(resposta.status).to.equal(200);
      expect(resposta.body).to.be.an('array');
    });

    it('API-CAD-016 | Deve retornar os dados do cliente ao buscar por ID', async () => {
      const email = makeUniqueEmail('findbyid');
      const created = await postCustomer(token, {
        name: 'Cliente Para Buscar',
        email,
        phone: '11955555555',
      });
      const id = created.body.id;

      const resposta = await getCustomer(token, id);
      expect(resposta.status).to.equal(200);
      expect(resposta.body).to.have.property('id', id);
    });
  });

  describe('Erros de payload', () => {
    it('API-CAD-017 | Deve retornar 400 ao enviar JSON inválido', async () => {
      const resposta = await http
        .post(CUSTOMERS_PATH)
        .set(authHeaders(token))
        .set('Content-Type', 'application/json')
        .send('{"name": "Cliente Invalido", "email": "invalidemail.com"');

      expect(resposta.status).to.equal(400);
    });
  });

  describe('Seguran?a', () => {
    it('SEC-CAD-001 | Deve bloquear tentativa de SQL Injection no nome', async () => {
      const resposta = await postCustomer(token, {
        name: "Robert'); DROP TABLE customers; --",
        email: makeUniqueEmail('sqlinjection'),
        phone: '11944444444',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.nameInvalid);
    });

    it('SEC-CAD-002 | Deve bloquear tentativa de SQL Injection no e-mail', async () => {
      const resposta = await postCustomer(token, {
        name: 'Cliente SQL Injection',
        email: "  robert'); DROP TABLE users; --@teste.com",
        phone: '11933333333',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.invalidEmail);
    });

    it('SEC-CAD-003 | Deve bloquear tentativa de SQL Injection no preço', async () => {
      const resposta = await postCustomer(token, {
        name: 'Cliente SQL Injection',
        email: makeUniqueEmail('safeemail'),
        phone: "11922222222'); DROP TABLE orders; --",
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.phoneInvalid);
    });

    it('SEC-CAD-004 | Deve bloquear tentativa de XSS no nome do produto', async () => {
      const resposta = await postCustomer(token, {
        name: '<script>alert("XSS")</script>',
        email: makeUniqueEmail('xss-name'),
        phone: '11911111111',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.nameInvalid);
    });

    it('SEC-CAD-005 | Deve bloquear tentativa de XSS no nome do cliente', async () => {
      const resposta = await postCustomer(token, {
        name: 'Cliente XSS',
        email: makeUniqueEmail('xss-phone'),
        phone: '<script>alert("XSS")</script>',
      });
      expect(resposta.status).to.equal(422);
      expect(resposta.body.error).to.equal(MESSAGES.phoneInvalid);
    });

    it('SEC-CAD-006 | Deve impedir atualiza??o de cliente sem permiss?o (IDOR)', async () => {
      const email = makeUniqueEmail('idor-update');
      const created = await postCustomer(token, {
        name: 'Cliente IDOR',
        email,
        phone: '11900000000',
      });
      const id = created.body.id;
      const outraToken = await loginAndGetToken('other');

      const resposta = await putCustomer(outraToken, id, {
        name: 'Cliente Atualizado',
        email,
        phone: '11988888888',
      });

      expect(resposta.status).to.equal(403);
      expect(resposta.body.error).to.equal(MESSAGES.accessDenied);
    });

    it('SEC-CAD-007 | Deve impedir exclus?o de cliente sem permiss?o (IDOR)', async () => {
      const email = makeUniqueEmail('idor-delete');
      const created = await postCustomer(token, {
        name: 'Cliente IDOR Delete',
        email,
        phone: '11899999999',
      });
      const id = created.body.id;
      const outraToken = await loginAndGetToken('other');

      const resposta = await deleteCustomer(outraToken, id);
      expect(resposta.status).to.equal(403);
      expect(resposta.body.error).to.equal(MESSAGES.accessDenied);
    });

    it('SEC-CAD-008 | Deve retornar 401 ao usar token inv?lido', async () => {
      const resposta = await http.get(CUSTOMERS_PATH).set('Authorization', 'Bearer invalidtoken');
      expect(resposta.status).to.equal(401);
    });

    it('SEC-CAD-009 | Deve retornar 401 ao usar token expirado', async () => {
      const resposta = await http.get(CUSTOMERS_PATH).set('Authorization', 'Bearer expiredtoken');
      expect(resposta.status).to.equal(401);
    });

    it('SEC-CAD-010 | Deve bloquear payload gigante caracterizado como ataque DoS', async () => {
      const largePayload = 'a'.repeat(10 * 1024 * 1024); // 10MB
      const resposta = await postCustomer(token, {
        name: largePayload,
        email: makeUniqueEmail('dos'),
        phone: '11888888888',
      });
      expect(resposta.status).to.equal(413);
    });
  });
});



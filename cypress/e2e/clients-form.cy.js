let identifications;

const openClientsForm = () => {
  cy.stubDashboardMetrics();
  cy.stubCustomerList();
  cy.loginAsAdmin();
  cy.openClientsFromDashboard();
  cy.wait('@customersList');
};

const fillIdentification = ({
  type = '',
  name,
  email,
  phone,
  cpf = '',
  cnpj = '',
  birthDate = '',
} = {}) => {
  if (type) {
    cy.get('#create-type').select(type, { force: true });
  }
  if (name !== undefined) {
    cy.get('#create-name').clear();
    if (name) cy.get('#create-name').type(name);
  }
  if (email !== undefined) {
    cy.get('#create-email').clear();
    if (email) cy.get('#create-email').type(email);
  }
  if (phone !== undefined) {
    cy.get('#create-phone').clear();
    if (phone) cy.get('#create-phone').type(phone);
  }
  if (cpf !== undefined && cpf !== '') {
    cy.get('#create-cpf').clear().type(cpf);
  }
  if (cnpj !== undefined && cnpj !== '') {
    cy.get('#create-cnpj').clear().type(cnpj);
  }
  if (birthDate !== undefined && birthDate !== '') {
    cy.get('#create-birth-date').clear().type(birthDate);
  }
};

const submitClientForm = () => cy.get('#create-submit').click();

const stubCustomerCreation = (options = {}) => {
  cy.intercept('POST', '**/api/customers', (req) => {
    req.reply({
      statusCode: options.statusCode || 201,
      delay: options.delay || 0,
      body:
        options.body ||
        Object.assign({ id: 'generated-client', ownerId: 'admin-user' }, req.body),
    });
  }).as(options.alias || 'createCustomer');
};

const stubCnpjLookup = (data = {}) => {
  cy.intercept('GET', /\/api\/cnpj\/\d+/, (req) => {
    req.reply({ statusCode: 200, body: data });
  }).as('cnpjLookup');
};

const stubCepLookup = (data = {}, status = 200) => {
  cy.intercept('GET', /\/api\/cep\/\d+/, (req) => {
    req.reply({ statusCode: status, body: data });
  }).as('cepLookup');
};

describe('SGVC - Cadastro e formulario de clientes', () => {
  before(() => {
    cy.fixture('client-identifications').then((data) => {
      identifications = data;
    });
  });

  beforeEach(() => {
    openClientsForm();
  });

  describe('Cadastro - identificacao do cliente', () => {
    it('Cadastro PF completo', () => {
      stubCustomerCreation();
      fillIdentification({
        type: 'PF',
        name: identifications.pf.name,
        email: identifications.pf.email,
        phone: identifications.pf.phone,
        cpf: identifications.pf.cpf,
        birthDate: identifications.pf.birthDate,
      });
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Cadastro PJ completo', () => {
      stubCustomerCreation();
      stubCnpjLookup({
        name: identifications.pj.name,
        addressStreet: 'Rua Aurora',
        addressNeighborhood: 'Centro',
        addressCity: 'Sao Paulo',
        addressState: 'SP',
        addressPostalCode: '01234567',
        phone: identifications.pj.phone,
      });
      fillIdentification({
        type: 'PJ',
        name: identifications.pj.name,
        email: identifications.pj.email,
        phone: identifications.pj.phone,
        cnpj: identifications.pj.cnpj,
        birthDate: identifications.pj.birthDate,
      });
      cy.get('#create-cnpj').focus().blur();
      cy.wait('@cnpjLookup');
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Sem selecao PF ou PJ ainda permite submissao', () => {
      stubCustomerCreation();
      fillIdentification({
        name: 'Camila SemTipo',
        email: 'camila@semtipo.com',
        phone: '(11) 91313-1313',
      });
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Nome vazio mostra erro', () => {
      fillIdentification({
        email: 'semnome@teste.com',
        phone: '(11) 90000-0000',
      });
      submitClientForm();
      cy.get('#create-name-error').should('be.visible').and('contain', 'Nome deve ter 3 a 120 caracteres.');
    });

    it('Nome com numeros e permitido no formulario', () => {
      fillIdentification({
        name: 'Ana123 Silva',
      });
      cy.get('#create-name').blur();
      cy.get('#create-name-error').should('not.be.visible');
    });

    it('Nome com caracteres especiais permanece valido', () => {
      fillIdentification({ name: "Joao & Co.' - Teste" });
      cy.get('#create-name').blur();
      cy.get('#create-name-error').should('not.be.visible');
    });

    it('Email valido e aceito', () => {
      fillIdentification({ email: 'validacao@empresa.com' });
      cy.get('#create-email').blur();
      cy.get('#create-email-error').should('not.be.visible');
    });

    it('Email invalido indica erro', () => {
      fillIdentification({ email: identifications.invalidEmail });
      cy.get('#create-email').blur();
      cy.get('#create-email-error').should('be.visible').and('contain', 'Digite um e-mail válido.');
    });

    it('Email duplicado mostra alerta da API', () => {
      cy.intercept('POST', '**/api/customers', { statusCode: 409, body: { message: 'E-mail ja cadastrado' } }).as('duplicateEmail');
      fillIdentification({
        type: 'PF',
        name: 'Luis Email',
        email: identifications.duplicateEmail,
        phone: '(11) 91234-0000',
        cpf: identifications.pf.cpf,
      });
      submitClientForm();
      cy.wait('@duplicateEmail');
      cy.get('#clients-message').should('contain', 'E-mail ja cadastrado');
    });

    it('CPF valido formata automaticamente', () => {
      fillIdentification({
        type: 'PF',
        cpf: identifications.pf.cpf,
      });
      cy.get('#create-cpf').blur();
      cy.get('#create-cpf').should('have.value', '987.654.321-00');
    });

    it('CPF invalido sinaliza erro', () => {
      fillIdentification({
        type: 'PF',
        cpf: identifications.invalidCpf,
      });
      cy.get('#create-cpf').blur();
      cy.get('#create-cpf-error').should('be.visible').and('contain', 'CPF inválido.');
    });

    it('CPF duplicado recebe alerta da API', () => {
      cy.intercept('POST', '**/api/customers', { statusCode: 422, body: { message: 'CPF ja cadastrado' } }).as('cpfDuplicate');
      fillIdentification({
        type: 'PF',
        name: 'Duplicado CPF',
        email: 'cpfdup@teste.com',
        phone: '(11) 91333-3333',
        cpf: identifications.duplicateCpf,
      });
      submitClientForm();
      cy.wait('@cpfDuplicate');
      cy.get('#clients-message').should('contain', 'CPF ja cadastrado');
    });

    it('CNPJ valido aciona consulta', () => {
      stubCnpjLookup({
        name: 'Atelie Aurora',
        addressStreet: 'Rua Aurora',
        addressCity: 'Sao Paulo',
        addressState: 'SP',
        addressNeighborhood: 'Liberdade',
        addressPostalCode: '01001000',
        phone: '(11) 90000-0000',
      });
      fillIdentification({
        type: 'PJ',
        cnpj: identifications.pj.cnpj,
      });
      cy.get('#create-cnpj').blur();
      cy.wait('@cnpjLookup');
      cy.get('#create-cnpj-success').should('be.visible').and('contain', 'Dados preenchidos');
    });

    it('CNPJ invalido exibe erro', () => {
      fillIdentification({
        type: 'PJ',
        cnpj: identifications.invalidCnpj,
      });
      cy.get('#create-cnpj').blur();
      cy.get('#create-cnpj-error').should('be.visible').and('contain', 'CNPJ inválido. Use 14 dígitos.');
    });

    it('CNPJ duplicado dispara mensagem da API', () => {
      cy.intercept('POST', '**/api/customers', { statusCode: 409, body: { message: 'CNPJ ja cadastrado' } }).as('cnpjDuplicate');
      stubCnpjLookup();
      fillIdentification({
        type: 'PJ',
        name: 'Duplicado CNPJ',
        email: 'dup@cnpj.com',
        phone: '(11) 91111-1212',
        cnpj: identifications.duplicateCnpj,
      });
      submitClientForm();
      cy.wait('@cnpjDuplicate');
      cy.get('#clients-message').should('contain', 'CNPJ ja cadastrado');
    });

    it('Telefone valido nao mostra erro', () => {
      fillIdentification({
        phone: '(11) 99999-8888',
      });
      cy.get('#create-phone').blur();
      cy.get('#create-phone-error').should('not.be.visible');
    });

    it('Telefone invalido apresenta erro', () => {
      fillIdentification({ phone: identifications.invalidPhone });
      cy.get('#create-phone').blur();
      cy.get('#create-phone-error').should('be.visible').and('contain', 'Telefone deve incluir DDD (10 ou 11 dígitos).');
    });

    it('Telefone com mascara fica formatado', () => {
      fillIdentification({ phone: '11988889999' });
      cy.get('#create-phone').blur();
      cy.get('#create-phone').should(($field) => {
        expect($field.val()).to.include('(');
      });
    });

    it('Botao WhatsApp habilita depois do telefone valido', () => {
      fillIdentification({ phone: '(11) 95555-0000' });
      cy.get('#create-phone').blur();
      cy.get('#create-phone-whatsapp').should('have.attr', 'href').and('contain', 'wa.me/55');
      cy.get('#create-phone-whatsapp').should('have.attr', 'aria-disabled', 'false');
    });

    it('Limite de caracteres no nome respeita 120 digitos', () => {
      const longName = 'A'.repeat(130);
      fillIdentification({ name: longName });
      cy.get('#create-name').invoke('val').should('have.length', 120);
    });
  });

  describe('Dados pessoais', () => {
    it('Data valida mostra idade aproximada', () => {
      fillIdentification({ birthDate: '1990-05-15' });
      cy.get('#create-birth-date').blur();
      cy.get('#create-birth-hint').should('contain', 'Idade aproximada');
    });

    it('Data invalida dispara erro', () => {
      // input type="date" não deixa digitar texto livre: força um valor fora do padrão
      cy.get('#create-birth-date').invoke('attr', 'type', 'text').invoke('val', '1990/05/15').trigger('input').trigger('change');
      cy.get('#create-birth-date').focus().blur();
      cy.get('#create-birth-date-error').should('be.visible').and('contain', 'Data de nascimento inválida.');
    });

    it('Data futura exibe aviso de intervalo', () => {
      cy.clock(new Date('2025-06-15').getTime(), ['Date']);
      fillIdentification({ birthDate: '2030-01-01' });
      cy.get('#create-birth-date').blur();
      cy.get('#create-birth-date-error').should('be.visible').and('contain', 'não pode ser futura');
      cy.clock().then((clock) => clock.restore());
    });

    it('Data muito antiga alerta o usuario', () => {
      cy.clock(new Date('2025-06-15').getTime(), ['Date']);
      fillIdentification({ birthDate: '1800-01-01' });
      cy.get('#create-birth-date').blur();
      cy.get('#create-birth-hint').should('contain', 'fora do intervalo esperado');
      cy.clock().then((clock) => clock.restore());
    });

    it('Campo vazio sem erro e sem aviso', () => {
      cy.get('#create-birth-date').focus().blur();
      cy.get('#create-birth-date-error').should('not.be.visible');
      cy.get('#create-birth-hint').should('be.hidden');
    });

    it('Digitacao manual atualiza o aviso de idade', () => {
      fillIdentification({ birthDate: '1992-03-03' });
      cy.get('#create-birth-hint').should('contain', 'Idade aproximada');
    });

    it('Selecao via calendario funciona com enter', () => {
      cy.get('#create-birth-date').focus().type('1995-07-07');
      cy.get('#create-birth-date').trigger('keydown', { key: 'Enter' });
      cy.get('#create-birth-date-error').should('not.be.visible');
    });

    it('Formato invalido apresenta mensagem amigavel', () => {
      cy.get('#create-birth-date').invoke('attr', 'type', 'text').invoke('val', '19950101').trigger('input').trigger('change');
      cy.get('#create-birth-date').focus().blur();
      cy.get('#create-birth-date-error').should('contain', 'Data de nascimento inválida.');
    });

    it('Aniversariante detectado muda o insight', () => {
      cy.clock(new Date('2025-06-15').getTime(), ['Date']);
      cy.intercept({ method: 'GET', pathname: '/api/customers', times: 1 }, (req) => {
        req.reply({ fixture: 'customers-list.json' });
      }).as('birthdayReload');
      cy.reload();
      cy.wait('@birthdayReload');
      cy.get('#birthday-insight').should('contain', 'Aniversariantes nos próximos 14 dias');
      cy.clock().then((clock) => clock.restore());
    });

    it('Aviso de aniversario respeita janela selecionada', () => {
      cy.get('#birthday-window').select('14');
      cy.get('#birthday-insight').should('contain', 'próximos 14 dias');
    });
  });

  describe('Endereco e CEP', () => {
    it('CEP valido preenche o endereco e chips', () => {
      stubCepLookup({
        logradouro: 'Rua Central',
        bairro: 'Marina',
        localidade: 'Sao Paulo',
        uf: 'SP',
      });
      cy.get('#create-address-postal').type('01001000');
      cy.get('#create-address-postal').blur();
      cy.wait('@cepLookup');
      cy.get('#create-address-street').should('contain.value', 'Rua Central');
      cy.get('#location-chips').should('be.visible');
      cy.get('#chip-uf').should('contain', 'UF SP');
      cy.get('#chip-city').should('contain', 'Sao Paulo');
    });

    it('CEP inválido mostra alerta especifico', () => {
      stubCepLookup({}, 400);
      cy.get('#create-address-postal').type('11111-111');
      cy.get('#create-address-postal').blur();
      cy.wait('@cepLookup');
      cy.get('#clients-message').should('contain', 'CEP inválido');
    });

    it('CEP inexistente informa para preencher manualmente', () => {
      stubCepLookup({}, 404);
      cy.get('#create-address-postal').type('22222222');
      cy.get('#create-address-postal').blur();
      cy.wait('@cepLookup');
      cy.get('#clients-message').should('contain', 'CEP não encontrado');
    });

    it('CEP com letras remove caracteres e mantem formato', () => {
      cy.get('#create-address-postal').type('AB12CD34');
      cy.get('#create-address-postal').blur();
      cy.get('#create-address-postal').should('contain.value', '1234');
    });

    it('Autopreenchimento ate o CEP atualiza chips', () => {
      stubCepLookup({
        logradouro: 'Praca Central',
        bairro: 'Centro',
        localidade: 'Rio de Janeiro',
        uf: 'RJ',
      });
      cy.get('#create-address-postal').type('20040002');
      cy.get('#create-address-postal').blur();
      cy.wait('@cepLookup');
      cy.get('#chip-uf').should('contain', 'UF RJ');
      cy.get('#chip-city').should('contain', 'Rio de Janeiro');
    });

    it('Falha da API de CEP exibe mensagem generica', () => {
      stubCepLookup({}, 500);
      cy.get('#create-address-postal').type('33333333');
      cy.get('#create-address-postal').blur();
      cy.wait('@cepLookup');
      cy.get('#clients-message').should('contain', 'Erro ao consultar CEP');
    });

    it('Fallback manual permite preencher o endereco', () => {
      stubCepLookup({}, 500);
      // Sem isso a tela tenta a ViaCEP direto e preenche o endereço real do CEP no meio do teste
      cy.intercept('GET', 'https://viacep.com.br/**', { statusCode: 500, body: {} });
      cy.get('#create-address-postal').type('44444444');
      cy.get('#create-address-postal').blur();
      cy.wait('@cepLookup');
      cy.get('#create-address-street').type('Rua Manual');
      // UF primeiro: escolher a UF recarrega a lista de cidades
      cy.get('#create-address-state').clear().type('sp').blur();
      cy.get('#create-address-state').should('have.value', 'SP');
      cy.get('#create-address-city').clear().type('Campinas').blur();
      cy.get('#location-chips').should('contain', 'UF SP').and('contain', 'Campinas');
    });

    it('Rua vazia ainda permite cadastro', () => {
      stubCustomerCreation();
      fillIdentification({
        type: 'PF',
        name: 'Rua Vazia',
        email: 'rua.vazia@teste.com',
        phone: '(11) 92222-0000',
        cpf: identifications.pf.cpf,
      });
      cy.get('#create-address-street').clear();
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Numero vazio tambem e aceito', () => {
      stubCustomerCreation();
      fillIdentification({
        type: 'PF',
        name: 'Numero Vazio',
        email: 'numero.vazio@teste.com',
        phone: '(11) 93333-0000',
        cpf: identifications.pf.cpf,
      });
      cy.get('#create-address-number').clear();
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Complemento opcional fica armazenado', () => {
      cy.get('#create-address-complement').clear().type('Apto 101');
      cy.get('#create-address-complement').should('have.value', 'Apto 101');
    });

    it('Bairro vazio nao trava o cadastro', () => {
      stubCustomerCreation();
      fillIdentification({
        type: 'PF',
        name: 'Bairro Sem Nome',
        email: 'bairro@teste.com',
        phone: '(11) 94444-0000',
        cpf: identifications.pf.cpf,
      });
      cy.get('#create-address-neighborhood').clear();
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Cidade vazia permite envio do formulario', () => {
      stubCustomerCreation();
      fillIdentification({
        type: 'PF',
        name: 'Cidade Vazia',
        email: 'cidade@teste.com',
        phone: '(11) 95555-0000',
        cpf: identifications.pf.cpf,
      });
      cy.get('#create-address-city').clear();
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('UF vazia tambem e aceita', () => {
      stubCustomerCreation();
      fillIdentification({
        type: 'PF',
        name: 'UF Transparente',
        email: 'uf@teste.com',
        phone: '(11) 96666-0000',
        cpf: identifications.pf.cpf,
      });
      cy.get('#create-address-state').clear();
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('UF invalida eh colocada em maiusculas', () => {
      cy.get('#create-address-state').clear().type('xx').blur();
      cy.get('#create-address-state').should('have.value', 'XX');
    });

    it('Persistencia do endereco mostra chips ativos', () => {
      cy.get('#create-address-city').clear().type('Campinas');
      cy.get('#create-address-state').clear().type('sp').blur();
      cy.get('#location-chips').should('be.visible');
      cy.get('#chip-city').should('contain', 'Campinas');
      cy.get('#chip-uf').should('contain', 'UF SP');
    });
  });

  describe('Observacoes', () => {
    it('Texto simples aparece e permite envio', () => {
      stubCustomerCreation();
      fillIdentification({ name: 'Cliente Observação', email: 'obs@teste.com', phone: '(11) 91111-2222' });
      cy.get('#create-notes').clear().type('Prefere contato por e-mail');
      submitClientForm();
      cy.wait('@createCustomer');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });

    it('Texto longo respeita limite', () => {
      const longNote = 'Observacao '.repeat(40);
      cy.get('#create-notes').clear().type(longNote);
      cy.get('#create-notes').invoke('val').should('have.length.at.most', 500);
    });

    it('Caracteres especiais sao mantidos', () => {
      const special = '@#$%&*()_+-=';
      cy.get('#create-notes').clear().type(special);
      cy.get('#create-notes').should('have.value', special);
    });

    it('Emojis nao quebram o campo', () => {
      const emojiText = '😀📞🚀';
      cy.get('#create-notes').clear().type(emojiText);
      cy.get('#create-notes').should('contain.value', '🚀');
    });

    it('Script malicioso aparece como texto no aviso', () => {
      stubCustomerCreation();
      const script = "<script>alert('x')</script>";
      cy.window().then((win) => cy.stub(win, 'alert').as('alertSpy'));
      fillIdentification({ name: 'Cliente Script', email: 'script@teste.com', phone: '(11) 91111-2222' });
      cy.get('#create-notes').clear().type(script);
      submitClientForm();
      cy.wait('@createCustomer').its('request.body.notes').should('contain', script);
      // O texto é salvo como texto: nenhum script roda na página
      cy.get('@alertSpy').should('not.have.been.called');
      cy.get('#clients-message').should('contain', 'Cliente criado com sucesso.');
    });
  });
});

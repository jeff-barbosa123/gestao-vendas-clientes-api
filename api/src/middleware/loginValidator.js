const MESSAGES = {
  invalidEmail: 'Formato de e-mail inv\u00e1lido',
  invalidPasswordType: 'Formato de senha inv\u00e1lido',
  emailRequired: 'E-mail \u00e9 obrigat\u00f3rio',
  passwordRequired: 'Senha \u00e9 obrigat\u00f3ria',
  emailPasswordRequired: 'E-mail e senha s\u00e3o obrigat\u00f3rios',
  passwordShort: 'Senha muito curta',
  passwordLong: 'Senha muito longa',
};

module.exports = (req, res, next) => {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type inv\u00e1lido' });
  }

  const { email, password } = req.body || {};

  if (email === undefined && password === undefined) {
    return res.status(400).json({ error: MESSAGES.emailPasswordRequired });
  }

  if (email === undefined) {
    return res.status(400).json({ error: MESSAGES.emailRequired });
  }

  if (password === undefined) {
    return res.status(400).json({ error: MESSAGES.passwordRequired });
  }

  if (email === null || email === '') {
    return res.status(400).json({ error: MESSAGES.emailRequired });
  }

  if (password === null || password === '') {
    return res.status(400).json({ error: MESSAGES.passwordRequired });
  }

  if (typeof email !== 'string') {
    return res.status(400).json({ error: MESSAGES.invalidEmail });
  }

  if (typeof password !== 'string') {
    return res.status(400).json({ error: MESSAGES.invalidPasswordType });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: MESSAGES.invalidEmail });
  }

  if (cleanPass.length < 3) {
    return res.status(400).json({ error: MESSAGES.passwordShort });
  }

  if (cleanPass.length > 30) {
    return res.status(400).json({ error: MESSAGES.passwordLong });
  }

  req.body.email = cleanEmail;
  req.body.password = cleanPass;

  next();
};

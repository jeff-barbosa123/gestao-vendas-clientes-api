'use strict';

const nodemailer = require('nodemailer');

const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:4000';

const FROM_EMAIL = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'SGVC <noreply@sgvc.local>';
const NODE_ENV = (process.env.NODE_ENV || '').toLowerCase();
const USE_ETHEREAL = String(process.env.EMAIL_USE_ETHEREAL || '').toLowerCase() === 'true';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

function hasSmtpConfigured() {
  return Boolean(
    SMTP_HOST && SMTP_HOST.trim() &&
    SMTP_USER && SMTP_USER.trim() &&
    SMTP_PASS && SMTP_PASS.trim() &&
    (SMTP_PORT > 0)
  );
}

function getSmtpTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_SECURE || false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function getEtherealTransport() {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log('[EMAIL] Conta Ethereal criada para desenvolvimento');
  console.log('[EMAIL] Email de teste: %s', testAccount.user);
  console.log('[EMAIL] Servidor SMTP: smtp.ethereal.email:587');
  return transporter;
}

function buildVerifyEmailLink(token) {
  const apiBase = (process.env.API_BASE_URL || '').trim();
  if (apiBase) {
    return `${apiBase.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  }
  const defaultApi = 'http://localhost:3000';
  return `${defaultApi}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

function buildResetPasswordLink(token) {
  const base = WEB_BASE_URL.endsWith('/') ? WEB_BASE_URL.slice(0, -1) : WEB_BASE_URL;
  return `${base}/reset-password.html?token=${encodeURIComponent(token)}`;
}

function baseHtml({ title, bodyHtml }) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
        <div style="font-size:14px;letter-spacing:.08em;color:#64748b;font-weight:700;">SGVC</div>
        <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;">${title}</h1>
        <div style="margin-top:14px;font-size:15px;line-height:1.6;color:#334155;">
          ${bodyHtml}
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />
        <div style="font-size:12px;color:#64748b;">
          Se você não reconhece esta ação, pode ignorar este e-mail.
        </div>
      </div>
      <div style="text-align:center;font-size:12px;color:#94a3b8;margin-top:14px;">
        © ${new Date().getFullYear()} SGVC
      </div>
    </div>
  </body>
</html>`;
}

function buttonHtml(href, label) {
  return `<p style="margin:18px 0;">
    <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;">
      ${label}
    </a>
  </p>
  <p style="margin:10px 0 0;font-size:12px;color:#64748b;word-break:break-all;">
    Se o botão não funcionar, copie e cole este link no navegador:<br/>
    <span>${href}</span>
  </p>`;
}

async function sendWithFallback({ to, subject, html, text }) {
  if (!hasSmtpConfigured()) {
    // Em desenvolvimento (ou quando EMAIL_USE_ETHEREAL=true), usa Ethereal para envio real com preview
    if (NODE_ENV !== 'production' || USE_ETHEREAL) {
      try {
        const transporter = await getEtherealTransport();
        console.log('[EMAIL] Path=ETHEREAL init to=%s subject="%s" from="%s"', to, subject, FROM_EMAIL);
        const info = await transporter.sendMail({ from: FROM_EMAIL, to, subject, html, text });
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('[EMAIL] Path=ETHEREAL status=SUCCESS id=%s', info && info.messageId ? info.messageId : '-');
        if (previewUrl) {
          console.log('[EMAIL] Preview do email: %s', previewUrl);
        }
        return { sent: true, id: info && info.messageId, preview: previewUrl || null };
      } catch (err) {
        console.error('[EMAIL] Path=ETHEREAL status=ERROR message=%s', err && err.message ? err.message : String(err));
        // Se Ethereal falhar, cai para simulação abaixo
      }
    }
    console.log('[EMAIL] Path=FALLBACK_SIMULATION reason=SMTP_not_configured');
    console.log('[EMAIL] to=%s subject="%s"', to, subject);
    if (text) console.log('[EMAIL][TEXT]', text);
    if (html) console.log('[EMAIL][HTML](truncated)', String(html).slice(0, 200) + '...');
    return { sent: false, simulated: true };
  }

  try {
    const transporter = getSmtpTransport();
    console.log('[EMAIL] Path=SMTP init to=%s subject="%s" host=%s port=%s from="%s"', to, subject, SMTP_HOST, SMTP_PORT || 587, FROM_EMAIL);
    const info = await transporter.sendMail({ from: FROM_EMAIL, to, subject, html, text });
    const messageId = info && info.messageId ? info.messageId : undefined;
    console.log('[EMAIL] Path=SMTP status=SUCCESS messageId=%s accepted=%s', messageId || '-', Array.isArray(info.accepted) ? info.accepted.length : 0);
    return { sent: true, id: messageId };
  } catch (err) {
    console.error('[EMAIL] Path=SMTP status=ERROR message=%s', err && err.message ? err.message : String(err));
    throw err;
  }
}



async function sendWelcomeEmail(user) {
  const title = 'Boas-vindas ao SGVC';
  const name = user && user.name ? user.name : 'Olá';
  const html = baseHtml({
    title,
    bodyHtml: `<p>Olá, <strong>${name}</strong>!</p>
      <p>Sua conta foi criada com sucesso. Você já pode acessar o painel e começar a cadastrar clientes, produtos e vendas.</p>`,
  });
  return sendWithFallback({
    to: user.email,
    subject: 'Bem-vindo(a) ao SGVC',
    html,
    text: `Olá, ${name}! Sua conta no SGVC foi criada com sucesso.`,
  });
}

async function sendEmailConfirmation(user, token) {
  const title = 'Confirme seu e-mail';
  const link = buildVerifyEmailLink(token);
  const name = user && user.name ? user.name : 'Olá';
  const html = baseHtml({
    title,
    bodyHtml: `<p>Olá, <strong>${name}</strong>!</p>
      <p>Para confirmar seu e-mail e ativar comunicações importantes, clique no botão abaixo:</p>
      ${buttonHtml(link, 'Confirmar e-mail')}`,
  });
  return sendWithFallback({
    to: user.email,
    subject: 'Confirme seu e-mail no SGVC',
    html,
    text: `Confirme seu e-mail: ${link}`,
  });
}

async function sendPasswordReset(user, token) {
  const title = 'Redefinição de senha';
  const link = buildResetPasswordLink(token);
  const name = user && user.name ? user.name : 'Olá';
  const html = baseHtml({
    title,
    bodyHtml: `<p>Olá, <strong>${name}</strong>!</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Se foi você, clique abaixo:</p>
      ${buttonHtml(link, 'Redefinir senha')}`,
  });
  return sendWithFallback({
    to: user.email,
    subject: 'Redefinição de senha - SGVC',
    html,
    text: `Use este link para redefinir sua senha: ${link}`,
  });
}

async function sendPasswordChanged(user) {
  const title = 'Senha alterada com sucesso';
  const name = user && user.name ? user.name : 'Olá';
  const html = baseHtml({
    title,
    bodyHtml: `<p>Olá, <strong>${name}</strong>!</p>
      <p>Sua senha foi alterada com sucesso.</p>
      <p>Se você não realizou esta alteração, recomendamos redefinir sua senha imediatamente.</p>`,
  });
  return sendWithFallback({
    to: user.email,
    subject: 'Sua senha foi alterada - SGVC',
    html,
    text: 'Sua senha foi alterada com sucesso. Se não foi você, recomendamos redefinir sua senha.',
  });
}

async function sendAccountDeleted(user) {
  const title = 'Conta excluída';
  const name = user && user.name ? user.name : 'Olá';
  const html = baseHtml({
    title,
    bodyHtml: `<p>Olá, <strong>${name}</strong>!</p>
      <p>Sua conta foi excluída do SGVC.</p>
      <p>Se você não reconhece esta ação, entre em contato com o suporte imediatamente.</p>`,
  });
  return sendWithFallback({
    to: user.email,
    subject: 'Sua conta foi excluída - SGVC',
    html,
    text: 'Sua conta foi excluída do SGVC. Se não foi você, contate o suporte.',
  });
}

// Compat: usado por código legado. Mantém assinatura básica.
async function sendMail(payload) {
  return sendWithFallback({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

module.exports = {
  sendMail,
  sendWelcomeEmail,
  sendEmailConfirmation,
  sendPasswordReset,
  sendPasswordChanged,
  sendAccountDeleted,
};
const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "SGVC";
const USE_ETHEREAL = String(process.env.USE_ETHEREAL_EMAIL || "true").toLowerCase() === "true";
const NODE_ENV = process.env.NODE_ENV || "development";

let transporter = null;
let etherealAccount = null;

/**
 * Cria conta Ethereal Email para desenvolvimento (não requer configuração)
 */
async function createEtherealAccount() {
  if (etherealAccount) return etherealAccount;
  try {
    etherealAccount = await nodemailer.createTestAccount();
    console.log('[EMAIL] Conta Ethereal criada para desenvolvimento');
    console.log(`[EMAIL] Email de teste: ${etherealAccount.user}`);
    console.log(`[EMAIL] Senha: ${etherealAccount.pass}`);
    console.log(`[EMAIL] Servidor SMTP: smtp.ethereal.email:587`);
    return etherealAccount;
  } catch (err) {
    console.error('[EMAIL] ❌ Erro ao criar conta Ethereal:', err.message);
    console.error('[EMAIL] ❌ Stack trace:', err.stack);
    return null;
  }
}

/**
 * Obtém o transporter configurado
 */
async function getTransporter() {
  if (transporter) return transporter;
  
  // Se SMTP está configurado, usa configuração personalizada
  if (SMTP_USER && SMTP_PASS && SMTP_HOST) {
    try {
      console.log('[EMAIL] 🔧 Tentando configurar SMTP:', SMTP_HOST, ':', SMTP_PORT);
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      
      // Verifica conexão
      await transporter.verify();
      console.log('[EMAIL] ✅ SMTP configurado e verificado:', SMTP_HOST);
      return transporter;
    } catch (err) {
      console.error('[EMAIL] ❌ Erro ao configurar/verificar SMTP:', err.message);
      console.error('[EMAIL] ⚠️ Tentando usar Ethereal como fallback...');
      transporter = null; // Limpa transporter para tentar Ethereal
    }
  }
  
  // Se em desenvolvimento e Ethereal está habilitado, usa Ethereal (ou como fallback)
  if (NODE_ENV !== 'production' && USE_ETHEREAL) {
    try {
      const account = await createEtherealAccount();
      if (account) {
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: account.user,
            pass: account.pass,
          },
        });
        console.log('[EMAIL] ✅ Usando Ethereal Email para desenvolvimento');
        return transporter;
      }
    } catch (err) {
      console.error('[EMAIL] ❌ Erro ao criar conta Ethereal:', err.message);
    }
  }
  
  console.error('[EMAIL] ❌ Nenhum transporter disponível. SMTP não configurado e Ethereal não disponível.');
  return null;
}

/**
 * Envia email
 */
async function sendMail(payload) {
  try {
    const transport = await getTransporter();
    if (!transport) {
      console.error('[EMAIL] ❌ Transport não disponível. SMTP não configurado e Ethereal não disponível.');
      return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
    }
    
    const from = SMTP_FROM_NAME ? `${SMTP_FROM_NAME} <${SMTP_FROM || (etherealAccount ? etherealAccount.user : 'noreply@sgvc.local')}>` : (SMTP_FROM || (etherealAccount ? etherealAccount.user : 'noreply@sgvc.local'));
    
    const mailOptions = {
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html || undefined,
    };
    
    console.log('[EMAIL] 📧 Tentando enviar email para:', payload.to);
    const info = await transport.sendMail(mailOptions);
    console.log('[EMAIL] ✅ Email enviado com sucesso. MessageId:', info.messageId);
    
    // Se usando Ethereal, mostra o link de preview
    if (USE_ETHEREAL && NODE_ENV !== 'production' && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('[EMAIL] 📬 Preview do email:', previewUrl);
        console.log('[EMAIL] 🌐 Para ver o email, acesse:', previewUrl);
        return { sent: true, previewUrl, info };
      }
    }
    
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL] ❌ Erro ao enviar email:', err.message);
    console.error('[EMAIL] ❌ Stack trace:', err.stack);
    return { sent: false, reason: "SEND_ERROR", error: err.message };
  }
}

/**
 * Verifica se o email está configurado
 */
function isEmailConfigured() {
  return !!(SMTP_USER && SMTP_PASS && SMTP_HOST) || (NODE_ENV !== 'production' && USE_ETHEREAL);
}

module.exports = {
  sendMail,
  isEmailConfigured,
};

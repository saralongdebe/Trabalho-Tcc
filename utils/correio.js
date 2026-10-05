const crypto = require('crypto');

function montarEmailRedefinicao({ nome, linkRedefinicao }) {
  return {
    subject: 'Recuperação de senha - ConectaVida',
    text: `Olá ${nome},\n\nRecebemos sua solicitação para redefinir sua senha.\nClique no link abaixo para criar uma nova senha:\n\n${linkRedefinicao}\n\nSe você não solicitou essa alteração, ignore este e-mail.\n\nEquipe ConectaVida`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f5f9ff; padding: 24px; border-radius: 18px; color: #102538;">
        <h2 style="margin: 0 0 16px; color: #163a52;">Recuperação de senha</h2>
        <p style="margin: 0 0 12px;">Olá <strong>${nome}</strong>,</p>
        <p style="margin: 0 0 16px; line-height: 1.6;">Recebemos sua solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.</p>
        <p style="margin: 0 0 20px;">
          <a href="${linkRedefinicao}" style="display: inline-bloqueio; background: linear-gradient(135deg, #1f6fbf, #2aa57c); color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 700;">Redefinir senha</a>
        </p>
        <p style="margin: 0 0 10px;">Ou copie e cole este link no navegador:</p>
        <p style="word-break: break-all; margin: 0; color: #1f6fbf;">${linkRedefinicao}</p>
        <p style="margin-top: 24px; color: #5f7186; font-size: 12px;">Se você não solicitou essa alteração, pode ignorar este e-mail.</p>
      </div>
    `
  };
}

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function gerarTokenRedefinicao() {
  return crypto.randomBytes(32).toString('hex');
}

async function enviarEmailRedefinicao({ transportador, destinatario, nome, linkRedefinicao }) {
  const conteudoEmail = montarEmailRedefinicao({ nome, linkRedefinicao });

  if (!transportador) {
    throw new Error('Transportador de e-mail não configurado.');
  }

  await transportador.sendMail({
    from: process.env.EMAIL_FROM || 'ConectaVida <noreply@conectavida.com>',
    to: destinatario,
    subject: conteudoEmail.subject,
    text: conteudoEmail.text,
    html: conteudoEmail.html
  });

  return true;
}

module.exports = {
  normalizarEmail,
  gerarTokenRedefinicao,
  enviarEmailRedefinicao,
  montarEmailRedefinicao
};

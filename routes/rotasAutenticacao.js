const express = require('express');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Usuario = require('../models/Usuario');
const Pedido = require('../models/Pedido');
const Bloqueio = require('../models/Bloqueio');
const exigirAutenticacao = require('../middleware/autenticacao');
const { obterConversasDoUsuario, enviarMensagemConversa, obterNotificacoes, marcarNotificacaoLida } = require('../estadoAplicacao');
const { gerarTokenRedefinicao, normalizarEmail, enviarEmailRedefinicao } = require('../utils/correio');

const router = express.Router();
const emailAdministrador = process.env.ADMIN_EMAIL || 'admin@conectavida.com';
const mensagemRedefinicaoSenha = 'O link de recuperação foi enviado para seu e-mail. Verifique também a caixa de spam.';

function criarTransportador() {
  const configuracaoEmail = [process.env.EMAIL_HOST, process.env.EMAIL_USER, process.env.EMAIL_PASS];
  const possuiValorExemplo = configuracaoEmail.some((value) => !value || /seu-email|sua-senha|exemplo\.com/i.test(value));
  if (possuiValorExemplo) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

router.get('/inicio', (req, res) => res.redirect('/'));

router.get('/entrar', (req, res) => {
  res.render('entrar', { usuario: req.session.usuario || null, erro: null, paginaAtual: 'entrar' });
});

router.post('/entrar', async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ email: req.body.email });
    if (!usuario) return res.render('entrar', { usuario: null, erro: 'Usuário não encontrado.', paginaAtual: 'entrar' });

    const senhaConfere = await bcrypt.compare(req.body.senha, usuario.senha);
    if (!senhaConfere) return res.render('entrar', { usuario: null, erro: 'Senha incorreta.', paginaAtual: 'entrar' });

    const sessaoUsuario = usuario.toObject ? usuario.toObject() : usuario;
    sessaoUsuario.perfilAcesso = sessaoUsuario.perfilAcesso || (sessaoUsuario.email === emailAdministrador ? 'administrador' : 'usuario');
    req.session.usuario = sessaoUsuario;
    res.redirect('/painel');
  } catch (erro) {
    res.render('entrar', { usuario: null, erro: 'Erro ao entrar.', paginaAtual: 'entrar' });
  }
});

router.get('/esqueci-senha', (req, res) => {
  res.render('recuperarSenha', {
    usuario: req.session.usuario || null,
    erro: null,
    sucesso: null,
    paginaAtual: 'entrar'
  });
});

router.post('/esqueci-senha', async (req, res) => {
  try {
    const email = normalizarEmail(req.body.email);
    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.render('recuperarSenha', {
        usuario: req.session.usuario || null,
        erro: null,
        sucesso: mensagemRedefinicaoSenha,
        paginaAtual: 'entrar'
      });
    }

    const transportador = criarTransportador();
    if (!transportador) {
      console.error('[email] SMTP não configurado. Preencha EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env.');
      return res.render('recuperarSenha', {
        usuario: req.session.usuario || null,
        erro: null,
        sucesso: mensagemRedefinicaoSenha,
        paginaAtual: 'entrar'
      });
    }

    await transportador.verify();

    const tokenRedefinicao = gerarTokenRedefinicao();
    const tokenRedefinicaoExpiraEm = new Date(Date.now() + 1000 * 60 * 30);

    usuario.tokenRedefinicao = tokenRedefinicao;
    usuario.tokenRedefinicaoExpiraEm = tokenRedefinicaoExpiraEm;
    await usuario.save();

    const linkRedefinicao = `${process.env.BASE_URL || `${req.protocol}://${req.get('host')}`}/redefinir-senha?token=${tokenRedefinicao}`;

    await enviarEmailRedefinicao({
      transportador,
      destinatario: usuario.email,
      nome: usuario.nome,
      linkRedefinicao
    });

    return res.render('recuperarSenha', {
      usuario: req.session.usuario || null,
      erro: null,
      sucesso: mensagemRedefinicaoSenha,
      paginaAtual: 'entrar'
    });
  } catch (erro) {
    console.error('[email] Erro ao enviar recuperação de senha:', erro.message);
    return res.render('recuperarSenha', {
      usuario: req.session.usuario || null,
      erro: null,
      sucesso: mensagemRedefinicaoSenha,
      paginaAtual: 'entrar'
    });
  }
});

router.get('/redefinir-senha', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.render('redefinirSenha', {
      usuario: req.session.usuario || null,
      erro: 'Token inválido.',
      sucesso: null,
      paginaAtual: 'entrar'
    });
  }

  const usuario = await Usuario.findOne({
    tokenRedefinicao: token,
    tokenRedefinicaoExpiraEm: { $gt: new Date() }
  });

  if (!usuario) {
    return res.render('redefinirSenha', {
      usuario: req.session.usuario || null,
      erro: 'Link expirado ou inválido. Solicite uma nova recuperação de senha.',
      sucesso: null,
      paginaAtual: 'entrar'
    });
  }

  res.render('redefinirSenha', {
    usuario: req.session.usuario || null,
    erro: null,
    sucesso: null,
    token,
    paginaAtual: 'entrar'
  });
});

router.post('/redefinir-senha', async (req, res) => {
  try {
    const { token, senha, confirmarSenha } = req.body;

    if (!token) {
      return res.render('redefinirSenha', {
        usuario: req.session.usuario || null,
        erro: 'Token de redefinição ausente.',
        sucesso: null,
        paginaAtual: 'entrar'
      });
    }

    if (senha !== confirmarSenha) {
      return res.render('redefinirSenha', {
        usuario: req.session.usuario || null,
        erro: 'As senhas não conferem.',
        sucesso: null,
        token,
        paginaAtual: 'entrar'
      });
    }

    const usuario = await Usuario.findOne({
      tokenRedefinicao: token,
      tokenRedefinicaoExpiraEm: { $gt: new Date() }
    });

    if (!usuario) {
      return res.render('redefinirSenha', {
        usuario: req.session.usuario || null,
        erro: 'Link expirado ou inválido. Solicite uma nova recuperação de senha.',
        sucesso: null,
        paginaAtual: 'entrar'
      });
    }

    usuario.senha = await bcrypt.hash(senha, 10);
    usuario.tokenRedefinicao = null;
    usuario.tokenRedefinicaoExpiraEm = null;
    await usuario.save();

    return res.render('entrar', {
      usuario: null,
      erro: null,
      sucesso: 'Senha redefinida com sucesso! Faça entrar com sua nova senha.',
      paginaAtual: 'entrar'
    });
  } catch (erro) {
    return res.render('redefinirSenha', {
      usuario: req.session.usuario || null,
      erro: 'Não foi possível redefinir a senha agora.',
      sucesso: null,
      paginaAtual: 'entrar'
    });
  }
});

router.get('/cadastro', (req, res) => {
  res.render('cadastro', { usuario: req.session.usuario || null, erro: null, paginaAtual: 'cadastro' });
});

router.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, confirmarSenha, cidade, telefone, tipoUsuario, tipoConta, tipo, nomeInstituicao, cnpj, nomeResponsavel, telefoneInstituicao, bairroAtuacao } = req.body;
    if (senha !== confirmarSenha) return res.render('cadastro', { usuario: null, erro: 'As senhas não conferem.', paginaAtual: 'cadastro' });

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) return res.render('cadastro', { usuario: null, erro: 'E-mail já cadastrado.', paginaAtual: 'cadastro' });

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const perfilAcesso = email === emailAdministrador ? 'administrador' : 'usuario';
    const tipoSelecionado = tipoUsuario || tipoConta || tipo || 'solicitante';
    const ehOng = tipoSelecionado === 'ONG';
    const tipoResolvido = ehOng ? 'solicitante' : tipoSelecionado;
    const usuario = new Usuario({
      nome: ehOng ? (nomeInstituicao || nome) : nome,
      email,
      senha: senhaCriptografada,
      cidade,
      telefone: ehOng ? (telefoneInstituicao || telefone) : telefone,
      tipoUsuario: tipoResolvido,
      tipo: ehOng ? 'ONG' : 'pessoa_comum',
      nomeInstituicao: ehOng ? nomeInstituicao : '',
      cnpj: ehOng ? cnpj : '',
      nomeResponsavel: ehOng ? nomeResponsavel : '',
      telefoneInstituicao: ehOng ? telefoneInstituicao : '',
      bairroAtuacao: ehOng ? bairroAtuacao : '',
      perfilAcesso
    });
    await usuario.save();

    const sessaoUsuario = usuario.toObject ? usuario.toObject() : usuario;
    req.session.usuario = sessaoUsuario;
    res.redirect('/painel');
  } catch (erro) {
    res.render('cadastro', { usuario: null, erro: 'Erro ao cadastrar usuário.', paginaAtual: 'cadastro' });
  }
});

router.get('/painel', exigirAutenticacao, async (req, res) => {
  const [usuariosCadastrados, concluidos, pedidosAtivos] = await Promise.all([
    Usuario.countDocuments({ perfilAcesso: { $ne: 'administrador' } }),
    Pedido.countDocuments({ situacao: { $in: ['concluido', 'concluída'] } }),
    Pedido.countDocuments({ situacao: { $in: ['aberto', 'em andamento'] } })
  ]);
  res.render('painel', {
    usuario: req.session.usuario,
    notificacoes: obterNotificacoes(),
    indicadores: { usuarios: usuariosCadastrados, concluidos, pedidosAtivos },
    paginaAtual: 'painel'
  });
});

router.get('/perfil', exigirAutenticacao, (req, res) => {
  res.render('perfil', { usuario: req.session.usuario, erro: null, sucesso: null, paginaAtual: 'perfil' });
});

router.post('/perfil', exigirAutenticacao, async (req, res) => {
  try {
    const { nome, email, cidade, telefone, senha, confirmarSenha } = req.body;
    if (!nome || !email || !cidade || !telefone) {
      return res.render('perfil', { usuario: req.session.usuario, erro: 'Preencha todos os campos obrigatórios.', sucesso: null, paginaAtual: 'perfil' });
    }
    if (senha && senha !== confirmarSenha) {
      return res.render('perfil', { usuario: req.session.usuario, erro: 'As senhas não conferem.', sucesso: null, paginaAtual: 'perfil' });
    }

    const usuario = await Usuario.findById(req.session.usuario._id);
    if (!usuario) return res.redirect('/sair');
    const emailNormalizado = normalizarEmail(email);
    const emailJaCadastrado = await Usuario.findOne({ email: emailNormalizado, _id: { $ne: usuario._id } });
    if (emailJaCadastrado) {
      return res.render('perfil', { usuario: req.session.usuario, erro: 'Este e-mail já está cadastrado.', sucesso: null, paginaAtual: 'perfil' });
    }

    usuario.nome = nome.trim();
    usuario.email = emailNormalizado;
    usuario.cidade = cidade.trim();
    usuario.telefone = telefone.trim();
    if (senha) usuario.senha = await bcrypt.hash(senha, 10);
    await usuario.save();
    req.session.usuario = usuario.toObject();
    res.render('perfil', { usuario: req.session.usuario, erro: null, sucesso: 'Perfil atualizado com sucesso.', paginaAtual: 'perfil' });
  } catch (erro) {
    res.render('perfil', { usuario: req.session.usuario, erro: 'Não foi possível atualizar o perfil.', sucesso: null, paginaAtual: 'perfil' });
  }
});

router.post('/perfil/excluir', exigirAutenticacao, async (req, res) => {
  try {
    const idUsuario = req.session.usuario._id;
    await Promise.all([
      Pedido.deleteMany({ solicitante: idUsuario }),
      Pedido.deleteMany({ voluntario: idUsuario }),
      Bloqueio.deleteMany({ $or: [{ voluntario: idUsuario }, { solicitante: idUsuario }] }),
      Usuario.findByIdAndDelete(idUsuario)
    ]);
    req.session.destroy(() => res.redirect('/'));
  } catch (erro) {
    res.redirect('/perfil');
  }
});

router.get('/conversas', exigirAutenticacao, (req, res) => {
  const conversas = obterConversasDoUsuario(req.session.usuario._id);
  res.render('conversas', { usuario: req.session.usuario, conversas, paginaAtual: 'conversas' });
});

router.post('/conversas', exigirAutenticacao, (req, res) => {
  const { idPedido, mensagem } = req.body;
  if (mensagem) {
    enviarMensagemConversa(idPedido || 'default', req.session.usuario._id, req.session.usuario.nome, mensagem);
  }
  res.redirect('/conversas');
});

router.get('/notificacoes', exigirAutenticacao, (req, res) => {
  res.render('notificacoes', { usuario: req.session.usuario, notificacoes: obterNotificacoes(), paginaAtual: 'notificacoes' });
});

router.post('/notificacoes/:id/ler', exigirAutenticacao, (req, res) => {
  const updated = marcarNotificacaoLida(obterNotificacoes(), req.params.id);
  const notificacoes = obterNotificacoes();
  notificacoes.splice(0, notificacoes.length, ...updated);
  res.redirect('/notificacoes');
});

router.get('/administrador', exigirAutenticacao, (req, res) => {
  if (req.session.usuario.perfilAcesso !== 'administrador') {
    return res.redirect('/painel');
  }
  Promise.all([
    Usuario.countDocuments({ perfilAcesso: { $ne: 'administrador' } }),
    Pedido.countDocuments({ situacao: { $in: ['concluido', 'concluída'] } }),
    Pedido.countDocuments({ situacao: { $in: ['aberto', 'em andamento'] } }),
    Bloqueio.find({ situacao: 'pendente' }).populate('voluntario solicitante').sort({ criadoEm: -1 })
  ]).then(([usuariosCadastrados, concluidos, pedidosAtivos, bloqueios]) => {
    res.render('administrador', {
      usuario: req.session.usuario,
      notificacoes: obterNotificacoes(),
      indicadores: { usuarios: usuariosCadastrados, concluidos, pedidosAtivos },
      bloqueios: bloqueios,
      paginaAtual: 'administrador'
    });
  }).catch(() => res.redirect('/painel'));
});

router.post('/administrador/bloqueios/:id/analisar', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.perfilAcesso !== 'administrador') return res.redirect('/painel');
  await Bloqueio.findByIdAndUpdate(req.params.id, { situacao: 'analisado' });
  res.redirect('/administrador');
});

router.get('/sair', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Pedido = require('../models/Pedido');
const Usuario = require('../models/Usuario');
const Bloqueio = require('../models/Bloqueio');
const exigirAutenticacao = require('../middleware/autenticacao');
const { filtrarPedidos, criarConversaDoPedido, buscarConversaDoPedido } = require('../estadoAplicacao');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${Math.round(Math.random() * 100000)}${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, file.mimetype.startsWith('image/'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/pedir-ajuda', exigirAutenticacao, (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'solicitante') {
    return res.redirect('/painel');
  }

  res.render('novoPedido', {
    usuario: req.session.usuario,
    erro: null,
      publicado: req.query.publicado === '1',
    pedido: null,
      editando: false,
    paginaAtual: 'novo-pedido'
  });
});

router.get('/meus-pedidos', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'solicitante') {
    return res.redirect('/painel');
  }

  const documentosPedido = await Pedido.find({ solicitante: req.session.usuario._id }).populate('voluntario').sort({ criadoEm: -1 });
  const pedidos = documentosPedido.map((pedido) => (pedido.toObject ? pedido.toObject() : pedido));

  res.render('meusPedidos', {
    usuario: req.session.usuario,
    pedidos,
      editado: req.query.editado === '1',
    paginaAtual: 'meus-pedidos'
  });
});

router.get('/ajudar', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'voluntario') {
    return res.redirect('/painel');
  }

  const busca = req.query.q || '';
  const usuariosBloqueados = await Bloqueio.find({ voluntario: req.session.usuario._id, situacao: { $in: ['pendente', 'analisado'] } }).distinct('solicitante');
  const documentosPedido = await Pedido.find({ situacao: 'aberto', solicitante: { $nin: usuariosBloqueados } }).populate('solicitante').sort({ criadoEm: -1 });
  const pedidos = documentosPedido.map((pedido) => (pedido.toObject ? pedido.toObject() : pedido));
  const pedidosFiltrados = filtrarPedidos(pedidos, busca);

  const documentosPedidosAceitos = await Pedido.find({ voluntario: req.session.usuario._id }).populate('solicitante').sort({ criadoEm: -1 });
  const pedidosAceitos = documentosPedidosAceitos.map((pedido) => (pedido.toObject ? pedido.toObject() : pedido));

  res.render('ajudar', {
    usuario: req.session.usuario || null,
    pedidos: pedidosFiltrados,
    pedidosAceitos,
    busca,
    paginaAtual: 'ajudar'
  });
});

router.get('/relatorio', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'voluntario') {
    return res.redirect('/painel');
  }

  const query = { voluntario: req.session.usuario._id };
  const documentosPedido = await Pedido.find(query).populate('solicitante voluntario').sort({ criadoEm: -1 });
  const pedidos = documentosPedido.map((pedido) => (pedido.toObject ? pedido.toObject() : pedido));
  res.render('relatorio', { usuario: req.session.usuario, pedidos, paginaAtual: 'relatorio' });
});

router.get('/pedido/:id/editar', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'solicitante') return res.redirect('/painel');
  const pedido = await Pedido.findOne({ _id: req.params.id, solicitante: req.session.usuario._id });
  if (!pedido) return res.redirect('/meus-pedidos');

  res.render('novoPedido', {
    usuario: req.session.usuario,
    erro: null,
    publicado: false,
    pedido,
    editando: true,
    paginaAtual: 'meus-pedidos'
  });
});

router.post('/novo-pedido', exigirAutenticacao, upload.single('foto'), async (req, res) => {
  try {
    if (req.session.usuario.tipoUsuario !== 'solicitante') {
      return res.render('novoPedido', {
        usuario: req.session.usuario,
        erro: 'Somente pessoas que precisam de ajuda podem publicar pedidos.',
        publicado: false,
        pedido: null,
        editando: false,
        paginaAtual: 'novo-pedido'
      });
    }

    const ehOng = req.session.usuario.tipo === 'ONG';
    const ehParaTerceiro = ehOng && req.body.ehParaTerceiro === 'true';
    if (ehParaTerceiro && (!req.body.nomeBeneficiarioFinal || req.body.autorizacaoLgpd !== 'on')) {
      return res.render('novoPedido', {
        usuario: req.session.usuario,
        erro: 'Informe o nome da pessoa e confirme a autorização da ONG para continuar.',
        publicado: false,
        pedido: req.body,
        editando: false,
        paginaAtual: 'novo-pedido'
      });
    }

    const pedido = new Pedido({
      titulo: req.body.titulo,
      categoria: req.body.categoria,
      descricao: req.body.descricao,
      cidade: req.body.cidade,
      localizacaoAproximada: req.body.localizacaoAproximada || '',
      dataPedido: req.body.dataPedido || '',
      horarioPedido: req.body.horarioPedido || '',
      telefone: ehParaTerceiro ? (req.body.telefoneBeneficiarioFinal || req.session.usuario.telefoneInstituicao || req.session.usuario.telefone) : req.body.telefone,
      informacoesAdicionais: req.body.informacoesAdicionais || '',
      foto: req.file ? `/uploads/${req.file.filename}` : '',
      solicitante: req.session.usuario._id,
      ehParaTerceiro,
      idOngSolicitante: ehParaTerceiro ? req.session.usuario._id : null,
      nomeBeneficiarioFinal: ehParaTerceiro ? req.body.nomeBeneficiarioFinal : '',
      idadeBeneficiarioFinal: ehParaTerceiro && req.body.idadeBeneficiarioFinal ? Number(req.body.idadeBeneficiarioFinal) : null,
      enderecoBeneficiarioFinal: ehParaTerceiro ? req.body.enderecoBeneficiarioFinal || '' : '',
      telefoneBeneficiarioFinal: ehParaTerceiro ? req.body.telefoneBeneficiarioFinal || '' : '',
      descricaoSituacaoBeneficiario: ehParaTerceiro ? req.body.descricaoSituacaoBeneficiario || '' : '',
      autorizacaoLgpd: ehParaTerceiro,
      temAcessoInternet: !ehParaTerceiro || req.body.temAcessoInternet !== 'nao'
    });

    await pedido.save();
    res.redirect('/pedir-ajuda?publicado=1');
  } catch (erro) {
    res.render('novoPedido', {
      usuario: req.session.usuario,
      erro: 'Erro ao criar pedido.',
      publicado: false,
      pedido: null,
      editando: false,
      paginaAtual: 'novo-pedido'
    });
  }
});

router.post('/pedido/:id/editar', exigirAutenticacao, upload.single('foto'), async (req, res) => {
  try {
    if (req.session.usuario.tipoUsuario !== 'solicitante') return res.redirect('/painel');
    const pedido = await Pedido.findOne({ _id: req.params.id, solicitante: req.session.usuario._id });
    if (!pedido) return res.redirect('/meus-pedidos');

    pedido.titulo = req.body.titulo;
    pedido.categoria = req.body.categoria;
    pedido.descricao = req.body.descricao;
    pedido.cidade = req.body.cidade;
    pedido.localizacaoAproximada = req.body.localizacaoAproximada || '';
    pedido.dataPedido = req.body.dataPedido || '';
    pedido.horarioPedido = req.body.horarioPedido || '';
    pedido.telefone = req.body.telefone;
    pedido.informacoesAdicionais = req.body.informacoesAdicionais || '';
    if (req.file) pedido.foto = `/uploads/${req.file.filename}`;
    if (req.session.usuario.tipo === 'ONG') {
      const ehParaTerceiro = req.body.ehParaTerceiro === 'true';
      if (ehParaTerceiro && (!req.body.nomeBeneficiarioFinal || req.body.autorizacaoLgpd !== 'on')) {
        return res.redirect(`/pedido/${req.params.id}/editar`);
      }
      pedido.ehParaTerceiro = ehParaTerceiro;
      pedido.idOngSolicitante = ehParaTerceiro ? req.session.usuario._id : null;
      pedido.nomeBeneficiarioFinal = ehParaTerceiro ? req.body.nomeBeneficiarioFinal : '';
      pedido.idadeBeneficiarioFinal = ehParaTerceiro && req.body.idadeBeneficiarioFinal ? Number(req.body.idadeBeneficiarioFinal) : null;
      pedido.enderecoBeneficiarioFinal = ehParaTerceiro ? req.body.enderecoBeneficiarioFinal || '' : '';
      pedido.telefoneBeneficiarioFinal = ehParaTerceiro ? req.body.telefoneBeneficiarioFinal || '' : '';
      pedido.descricaoSituacaoBeneficiario = ehParaTerceiro ? req.body.descricaoSituacaoBeneficiario || '' : '';
      pedido.autorizacaoLgpd = ehParaTerceiro;
      pedido.temAcessoInternet = !ehParaTerceiro || req.body.temAcessoInternet !== 'nao';
    }
    await pedido.save();
      res.redirect('/meus-pedidos?editado=1');
  } catch (erro) {
    res.redirect(`/pedido/${req.params.id}/editar`);
  }
});

router.post('/pedido/:id/excluir', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'solicitante') return res.redirect('/painel');
  await Pedido.findOneAndDelete({ _id: req.params.id, solicitante: req.session.usuario._id });
  res.redirect('/meus-pedidos');
});

router.get('/pedidos', exigirAutenticacao, async (req, res) => {
  const busca = req.query.q || '';
  const documentosPedido = await Pedido.find({ situacao: 'aberto' }).populate('solicitante').sort({ criadoEm: -1 });
  const pedidos = documentosPedido.map((pedido) => (pedido.toObject ? pedido.toObject() : pedido));
  const pedidosFiltrados = filtrarPedidos(pedidos, busca);
  res.render('pedidos', {
    usuario: req.session.usuario || null,
    pedidos: pedidosFiltrados,
    busca,
    paginaAtual: 'pedidos'
  });
});

router.get('/pedido/:id', exigirAutenticacao, async (req, res) => {
  const pedido = await Pedido.findById(req.params.id).populate('solicitante').populate('voluntario');

  if (!pedido) {
    return res.redirect('/pedidos');
  }

  const conversasThread = buscarConversaDoPedido(req.params.id);

  res.render('pedido', {
    usuario: req.session.usuario || null,
    pedido,
    conversasThread,
    paginaAtual: 'pedidos'
  });
});

router.post('/pedido/:id/concluir', exigirAutenticacao, async (req, res) => {
  const pedido = await Pedido.findById(req.params.id);

  if (!pedido) {
    return res.redirect('/ajudar');
  }

  if (String(pedido.voluntario) !== String(req.session.usuario._id)) {
    return res.redirect('/ajudar');
  }

  pedido.situacao = 'concluido';
  await pedido.save();

  res.redirect('/ajudar');
});

router.post('/pedido/:id/avaliar', exigirAutenticacao, async (req, res) => {
  const pedido = await Pedido.findById(req.params.id);

  if (!pedido) {
    return res.redirect('/pedidos');
  }

  if (String(pedido.solicitante) !== String(req.session.usuario._id) || !['concluido', 'concluída'].includes(pedido.situacao)) {
    return res.redirect('/pedidos');
  }

  if (req.body.avaliacao) {
    pedido.avaliacao = Number(req.body.avaliacao);
  }

  pedido.comentarioAvaliacao = req.body.comentarioAvaliacao || '';
  await pedido.save();

  res.redirect('/relatorio');
});

router.post('/pedido/:id/bloquear', exigirAutenticacao, async (req, res) => {
  if (req.session.usuario.tipoUsuario !== 'voluntario') return res.redirect('/conversas');

  const motivosPermitidos = ['Violação de regras', 'Falta de educação', 'Pedido falso'];
  const pedido = await Pedido.findById(req.params.id);
  if (!pedido || !pedido.voluntario || String(pedido.voluntario) !== String(req.session.usuario._id)) {
    return res.redirect('/conversas');
  }
  if (!motivosPermitidos.includes(req.body.motivo)) return res.redirect('/conversas');

  await Bloqueio.findOneAndUpdate(
    { voluntario: req.session.usuario._id, solicitante: pedido.solicitante, situacao: 'pendente' },
    { voluntario: req.session.usuario._id, solicitante: pedido.solicitante, pedido: pedido._id, motivo: req.body.motivo },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.redirect('/relatorio');
});

router.post('/pedido/:id/quero-ajudar', exigirAutenticacao, async (req, res) => {
  const pedido = await Pedido.findById(req.params.id);

  if (!pedido) {
    return res.redirect('/ajudar');
  }

  if (req.session.usuario.tipoUsuario !== 'voluntario') {
    return res.redirect('/painel');
  }

  if (pedido.situacao === 'concluido' || pedido.situacao === 'concluída') {
    return res.redirect('/ajudar');
  }

  if (String(pedido.solicitante) === String(req.session.usuario._id)) {
    return res.redirect('/ajudar');
  }

  const blocked = await Bloqueio.exists({
    voluntario: req.session.usuario._id,
    solicitante: pedido.solicitante,
    situacao: { $in: ['pendente', 'analisado'] }
  });
  if (blocked) return res.redirect('/ajudar');

  if (pedido.voluntario && String(pedido.voluntario) !== String(req.session.usuario._id)) {
    return res.redirect('/ajudar');
  }

  pedido.voluntario = req.session.usuario._id;
  pedido.situacao = 'em andamento';
  await pedido.save();

  const solicitante = await Usuario.findById(pedido.solicitante);
  const voluntario = await Usuario.findById(req.session.usuario._id);
  criarConversaDoPedido(String(pedido._id), solicitante, voluntario);

  res.redirect('/ajudar');
});

module.exports = router;

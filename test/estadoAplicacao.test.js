const test = require('node:test');
const assert = require('node:assert/strict');
const { filtrarPedidos, marcarNotificacaoLida, criarConversaDoPedido, obterConversasDoUsuario, enviarMensagemConversa } = require('../estadoAplicacao');
const Usuario = require('../models/Usuario');
const { validarDadosCadastro, normalizarDadosCadastro } = require('../utils/cadastro');

test('filtra pedidos por texto e cidade', () => {
  const pedidos = [
    { id: '1', titulo: 'Ajuda com supermercado', cidade: 'São Paulo', categoria: 'Alimentação', descricao: 'Preciso buscar mantimentos' },
    { id: '2', titulo: 'Transporte para consulta', cidade: 'Campinas', categoria: 'Saúde', descricao: 'Preciso de transporte' }
  ];

  const resultado = filtrarPedidos(pedidos, 'supermercado');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].id, '1');
});

test('não expõe pedidos concluídos na lista disponível para ajudantes', () => {
  const pedidos = [
    { id: '1', titulo: 'Ajuda com mercado', situacao: 'aberto', cidade: 'São Paulo', categoria: 'Alimentação', descricao: 'Preciso comprar mantimentos' },
    { id: '2', titulo: 'Entrega de remédio', situacao: 'concluido', cidade: 'Campinas', categoria: 'Saúde', descricao: 'Pedido finalizado' }
  ];

  const resultado = filtrarPedidos(pedidos, '');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].id, '1');
});

test('marca uma notificação como lida', () => {
  const notificacoes = [
    { id: 'n1', titulo: 'Novo pedido', lida: false },
    { id: 'n2', titulo: 'Voluntário aceito', lida: false }
  ];

  const resultado = marcarNotificacaoLida(notificacoes, 'n1');
  assert.equal(resultado[0].lida, true);
  assert.equal(resultado[1].lida, false);
});

test('cria e envia uma conversa entre solicitante e ajudante', () => {
  const solicitante = { _id: 'usuario-1', nome: 'Maria' };
  const voluntario = { _id: 'usuario-2', nome: 'João' };

  const conversa = criarConversaDoPedido('pedido-abc', solicitante, voluntario);
  assert.equal(conversa.idPedido, 'pedido-abc');
  assert.equal(conversa.idSolicitante, 'usuario-1');
  assert.equal(conversa.idVoluntario, 'usuario-2');

  const conversaSalva = enviarMensagemConversa('pedido-abc', 'usuario-1', 'Maria', 'Bom dia, consigo receber ajuda?');
  assert.equal(conversaSalva.mensagens.length, 1);

  const conversasDoSolicitante = obterConversasDoUsuario('usuario-1');
  assert.equal(conversasDoSolicitante.length, 1);
});

test('usuário sem tipo definido usa solicitante como padrão', () => {
  const usuario = new Usuario({
    nome: 'Ana',
    email: 'ana@email.com',
    senha: 'senha123',
    cidade: 'São Paulo',
    telefone: '11999999999'
  });

  assert.equal(usuario.tipoUsuario, 'solicitante');
});

test('valida cadastro de pessoa que precisa de ajuda', () => {
  const resultado = validarDadosCadastro({
    nome: 'Maria',
    email: 'maria@email.com',
    senha: 'senha123',
    confirmarSenha: 'senha123',
    cidade: 'Centro',
    telefone: '11988887777',
    tipoUsuario: 'solicitante'
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.dados.tipoUsuario, 'solicitante');
});

test('valida cadastro de ONG com dados específicos', () => {
  const resultado = validarDadosCadastro({
    nome: '',
    email: 'ong@email.com',
    senha: 'senha123',
    confirmarSenha: 'senha123',
    cidade: 'Centro',
    telefone: '1133334444',
    tipoUsuario: 'ONG',
    nomeInstituicao: 'Casa de Apoio',
    nomeResponsavel: 'Joana',
    telefoneInstituicao: '1133334444',
    bairroAtuacao: 'Centro'
  });

  assert.equal(resultado.valido, true);
  assert.equal(resultado.dados.tipoUsuario, 'solicitante');
  assert.equal(resultado.dados.tipo, 'ONG');
  assert.equal(resultado.dados.nome, 'Casa de Apoio');
});

test('normaliza cadastro de ONG mesmo sem nome pessoal', () => {
  const dados = normalizarDadosCadastro({
    nome: '',
    email: 'ong@email.com',
    senha: 'senha123',
    confirmarSenha: 'senha123',
    cidade: 'Centro',
    telefone: '1133334444',
    tipoUsuario: 'ONG',
    nomeInstituicao: 'Casa de Apoio',
    nomeResponsavel: 'Joana',
    telefoneInstituicao: '1133334444',
    bairroAtuacao: 'Centro'
  });

  assert.equal(dados.nome, 'Casa de Apoio');
  assert.equal(dados.tipoUsuario, 'solicitante');
  assert.equal(dados.tipo, 'ONG');
});

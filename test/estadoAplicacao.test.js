const test = require('node:test');
const assert = require('node:assert/strict');
const { filtrarPedidos, marcarNotificacaoLida, criarConversaDoPedido, obterConversasDoUsuario, enviarMensagemConversa } = require('../estadoAplicacao');
const Usuario = require('../models/Usuario');

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

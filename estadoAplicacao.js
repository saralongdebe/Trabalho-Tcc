const notificacoes = [
  { id: 'n1', titulo: 'Pedido recebido', mensagem: 'Seu pedido foi publicado com sucesso.', lida: false },
  { id: 'n2', titulo: 'Nova mensagem', mensagem: 'A equipe respondeu ao seu pedido.', lida: false }
];

const conversas = [
  { contato: 'Equipe', ultimaMensagem: 'Olá! Como podemos ajudar hoje?' }
];

const conversasPorPedido = [];

function filtrarPedidos(pedidos, busca = '') {
  const pedidosVisiveis = pedidos.filter((pedido) => {
    const situacao = (pedido.situacao || '').toLowerCase();
    return situacao !== 'concluido' && situacao !== 'concluída';
  });

  if (!busca) return pedidosVisiveis;
  const buscaNormalizada = busca.toLowerCase().trim();
  return pedidosVisiveis.filter((pedido) => {
    const textoBusca = `${pedido.titulo} ${pedido.descricao} ${pedido.cidade} ${pedido.categoria}`.toLowerCase();
    return textoBusca.includes(buscaNormalizada);
  });
}

function obterNotificacoes() {
  return notificacoes;
}

function marcarNotificacaoLida(listaNotificacoes, idNotificacao) {
  return listaNotificacoes.map((notificacao) =>
    notificacao.id === idNotificacao ? { ...notificacao, lida: true } : notificacao
  );
}

function obterConversas() {
  return conversas;
}

function criarConversaDoPedido(idPedido, solicitante, voluntario) {
  const conversaExistente = buscarConversaDoPedido(idPedido);
  if (conversaExistente) {
    return conversaExistente;
  }

  const conversa = {
    id: `${idPedido}-${Date.now()}-${Math.round(Math.random() * 10_000)}`,
    idPedido,
    idSolicitante: solicitante && solicitante._id ? String(solicitante._id) : solicitante,
    nomeSolicitante: solicitante && solicitante.nome ? solicitante.nome : 'Solicitante',
    idVoluntario: voluntario && voluntario._id ? String(voluntario._id) : voluntario,
    nomeVoluntario: voluntario && voluntario.nome ? voluntario.nome : 'Voluntário',
    criadaEm: new Date().toISOString(),
    mensagens: []
  };

  conversasPorPedido.push(conversa);
  return conversa;
}

function buscarConversaDoPedido(idPedido) {
  return conversasPorPedido.find((conversa) => String(conversa.idPedido) === String(idPedido));
}

function obterConversasDoUsuario(idUsuario) {
  const idNormalizado = String(idUsuario);
  return conversasPorPedido.filter((conversa) =>
    String(conversa.idSolicitante) === idNormalizado || String(conversa.idVoluntario) === idNormalizado
  );
}

function enviarMensagemConversa(idPedidoOuContato, idRemetenteOuMensagem, nomeRemetente, mensagem) {
  if (typeof nomeRemetente === 'string' && typeof mensagem === 'string') {
    const conversa = buscarConversaDoPedido(idPedidoOuContato);

    if (!conversa) {
      return { id: idPedidoOuContato, mensagens: [] };
    }

    const conteudo = {
      id: `${Date.now()}-${Math.round(Math.random() * 10_000)}`,
      idPedido: String(idPedidoOuContato),
      idRemetente: String(idRemetenteOuMensagem),
      nomeRemetente,
      mensagem,
      enviadaEm: new Date().toISOString()
    };

    conversa.mensagens.push(conteudo);
    conversas.unshift({ contato: nomeRemetente || 'Conversa', ultimaMensagem: mensagem });

    return conversa;
  }

  const contato = idPedidoOuContato;
  const texto = idRemetenteOuMensagem;
  conversas.unshift({ contato, ultimaMensagem: texto });
  return conversas;
}

module.exports = {
  filtrarPedidos,
  obterNotificacoes,
  marcarNotificacaoLida,
  obterConversas,
  enviarMensagemConversa,
  criarConversaDoPedido,
  buscarConversaDoPedido,
  obterConversasDoUsuario
};

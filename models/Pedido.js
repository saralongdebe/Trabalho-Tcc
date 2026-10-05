const mongoose = require('mongoose');

const esquemaPedido = new mongoose.Schema({
  titulo: { type: String, required: true },
  categoria: { type: String, required: true },
  descricao: { type: String, required: true },
  cidade: { type: String, required: true },
  localizacaoAproximada: { type: String, default: '' },
  dataPedido: { type: String, default: '' },
  horarioPedido: { type: String, default: '' },
  telefone: { type: String, required: true },
  informacoesAdicionais: { type: String, default: '' },
  foto: { type: String, default: '' },
  situacao: { type: String, default: 'aberto' },
  criadoEm: { type: Date, default: Date.now },
  solicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  voluntario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  avaliacao: { type: Number, min: 1, max: 5, default: null },
  comentarioAvaliacao: { type: String, default: '' },
  ehParaTerceiro: { type: Boolean, default: false },
  idOngSolicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  nomeBeneficiarioFinal: { type: String, default: '' },
  idadeBeneficiarioFinal: { type: Number, min: 0, default: null },
  enderecoBeneficiarioFinal: { type: String, default: '' },
  telefoneBeneficiarioFinal: { type: String, default: '' },
  descricaoSituacaoBeneficiario: { type: String, default: '' },
  autorizacaoLgpd: { type: Boolean, default: false },
  temAcessoInternet: { type: Boolean, default: true }
});

module.exports = mongoose.model('Pedido', esquemaPedido, 'pedidos');

const mongoose = require('mongoose');

const esquemaUsuario = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  cidade: { type: String, required: true },
  telefone: { type: String, required: true },
  tipoUsuario: { type: String, enum: ['solicitante', 'voluntario'], required: true, default: 'solicitante' },
  tipo: { type: String, enum: ['ONG', 'pessoa_comum'], default: 'pessoa_comum' },
  nomeInstituicao: { type: String, default: '' },
  cnpj: { type: String, default: '' },
  nomeResponsavel: { type: String, default: '' },
  telefoneInstituicao: { type: String, default: '' },
  bairroAtuacao: { type: String, default: '' },
  foto: { type: String, default: '' },
  perfilAcesso: { type: String, enum: ['usuario', 'administrador'], default: 'usuario' },
  tokenRedefinicao: { type: String, default: null },
  tokenRedefinicaoExpiraEm: { type: Date, default: null },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Usuario', esquemaUsuario, 'users');

const mongoose = require('mongoose');

const esquemaBloqueio = new mongoose.Schema({
  voluntario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  solicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  motivo: {
    type: String,
    enum: ['Violação de regras', 'Falta de educação', 'Pedido falso'],
    required: true
  },
  situacao: { type: String, enum: ['pendente', 'analisado'], default: 'pendente' },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bloqueio', esquemaBloqueio, 'bloqueios');

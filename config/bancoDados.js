const mongoose = require('mongoose');

async function migrarCampos(colecao, campos) {
  const operacoes = Object.entries(campos).map(([campoAntigo, campoNovo]) => ({
    updateMany: {
      filter: { [campoAntigo]: { $exists: true }, [campoNovo]: { $exists: false } },
      update: { $rename: { [campoAntigo]: campoNovo } }
    }
  }));

  await mongoose.connection.collection(colecao).bulkWrite(operacoes);
}

async function conectarBanco() {
  try {
 const uriMongo = process.env.MONGODB_URI;
    if (!uriMongo) {
      throw new Error('MONGO_URI ou MONGODB_URI não foi definido. Configure a variável de ambiente do Mongo no Render.');
    }
    await mongoose.connect(uriMongo);
    await Promise.all([
      migrarCampos('users', {
        name: 'nome',
        password: 'senha',
        city: 'cidade',
        phone: 'telefone',
        userType: 'tipoUsuario',
        photo: 'foto',
        role: 'perfilAcesso',
        resetToken: 'tokenRedefinicao',
        resetTokenExpires: 'tokenRedefinicaoExpiraEm',
        createdAt: 'criadoEm'
      }),
      migrarCampos('requests', {
        title: 'titulo',
        category: 'categoria',
        description: 'descricao',
        city: 'cidade',
        approximateLocation: 'localizacaoAproximada',
        requestDate: 'dataPedido',
        requestTime: 'horarioPedido',
        phone: 'telefone',
        additionalInfo: 'informacoesAdicionais',
        photo: 'foto',
        status: 'situacao',
        createdAt: 'criadoEm',
        user: 'solicitante',
        helper: 'voluntario',
        rating: 'avaliacao',
        ratingComment: 'comentarioAvaliacao'
      }),
      migrarCampos('blocks', {
        helper: 'voluntario',
        requester: 'solicitante',
        request: 'pedido',
        reason: 'motivo',
        status: 'situacao',
        createdAt: 'criadoEm'
      })
    ]);
    const usuarios = mongoose.connection.collection('users');
    await usuarios.updateMany({ perfilAcesso: 'admin' }, { $set: { perfilAcesso: 'administrador' } });
    await usuarios.updateMany({ perfilAcesso: 'user' }, { $set: { perfilAcesso: 'usuario' } });
    console.log('MongoDB conectado com sucesso');
  } catch (erro) {
    console.error('Erro ao conectar ao MongoDB:', erro.message);
  }
}

module.exports = conectarBanco;

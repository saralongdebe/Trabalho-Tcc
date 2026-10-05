function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarDadosCadastro(dados = {}) {
  const ehOng = normalizarTexto(dados.tipoUsuario) === 'ONG';
  const nome = ehOng ? normalizarTexto(dados.nomeInstituicao || dados.nome) : normalizarTexto(dados.nome);
  const telefone = ehOng ? normalizarTexto(dados.telefoneInstituicao || dados.telefone) : normalizarTexto(dados.telefone);

  return {
    nome,
    email: normalizarTexto(dados.email),
    senha: typeof dados.senha === 'string' ? dados.senha : '',
    confirmarSenha: typeof dados.confirmarSenha === 'string' ? dados.confirmarSenha : '',
    cidade: normalizarTexto(dados.cidade),
    telefone,
    tipoUsuario: ehOng ? 'solicitante' : (normalizarTexto(dados.tipoUsuario) || 'solicitante'),
    tipo: ehOng ? 'ONG' : 'pessoa_comum',
    nomeInstituicao: ehOng ? normalizarTexto(dados.nomeInstituicao) : '',
    cnpj: ehOng ? normalizarTexto(dados.cnpj) : '',
    nomeResponsavel: ehOng ? normalizarTexto(dados.nomeResponsavel) : '',
    telefoneInstituicao: ehOng ? normalizarTexto(dados.telefoneInstituicao) : '',
    bairroAtuacao: ehOng ? normalizarTexto(dados.bairroAtuacao) : ''
  };
}

function validarDadosCadastro(dados = {}) {
  const dadosNormalizados = normalizarDadosCadastro(dados);
  const erros = [];

  if (!dadosNormalizados.nome) {
    erros.push('Informe o nome ou nome da instituição.');
  }

  if (!dadosNormalizados.email) {
    erros.push('Informe um e-mail válido.');
  }

  if (!dadosNormalizados.senha.trim()) {
    erros.push('Informe uma senha.');
  }

  if (dadosNormalizados.senha && dadosNormalizados.senha !== dadosNormalizados.confirmarSenha) {
    erros.push('As senhas não conferem.');
  }

  if (!dadosNormalizados.cidade) {
    erros.push('Informe a cidade ou bairro.');
  }

  if (!dadosNormalizados.telefone) {
    erros.push('Informe o telefone.');
  }

  if (dadosNormalizados.tipo === 'ONG') {
    if (!dadosNormalizados.nomeInstituicao) {
      erros.push('Informe o nome da ONG / instituição.');
    }

    if (!dadosNormalizados.nomeResponsavel) {
      erros.push('Informe o nome do responsável.');
    }

    if (!dadosNormalizados.telefoneInstituicao) {
      erros.push('Informe o telefone / WhatsApp da ONG.');
    }

    if (!dadosNormalizados.bairroAtuacao) {
      erros.push('Informe o bairro de atuação da ONG.');
    }
  }

  return {
    valido: erros.length === 0,
    erros,
    dados: dadosNormalizados
  };
}

module.exports = {
  normalizarDadosCadastro,
  validarDadosCadastro
};

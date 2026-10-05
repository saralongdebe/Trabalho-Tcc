function exigirAutenticacao(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect('/entrar');
  }
  next();
}

module.exports = exigirAutenticacao;

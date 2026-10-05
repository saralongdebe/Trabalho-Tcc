require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const conectarBanco = require('./config/bancoDados');
const rotasAutenticacao = require('./routes/rotasAutenticacao');
const rotasPedidos = require('./routes/rotasPedidos');
const { obterNotificacoes } = require('./estadoAplicacao');

const aplicacao = express();
const enderecoServidor = process.env.HOST || '0.0.0.0';
const portaServidor = process.env.PORT || 3000;

aplicacao.set('view engine', 'ejs');
aplicacao.set('views', path.join(__dirname, 'views'));

aplicacao.use(express.urlencoded({ extended: true }));
aplicacao.use(express.static(path.join(__dirname, 'public')));
aplicacao.use(
  session({
    secret: process.env.SESSION_SECRET || 'conectavida-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

aplicacao.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.quantidadeNaoLida = req.session.usuario
    ? obterNotificacoes().filter((notificacao) => !notificacao.lida).length
    : 0;
  next();
});

aplicacao.use('/', rotasAutenticacao);
aplicacao.use('/', rotasPedidos);

aplicacao.get('/', (req, res) => {
  res.render('inicio', { usuario: req.session.usuario || null, erro: null, paginaAtual: 'inicio' });
});

aplicacao.get('/inicio', (req, res) => res.redirect('/'));

aplicacao.use((req, res) => {
  res.status(404).render('paginaNaoEncontrada', { usuario: req.session.usuario || null, paginaAtual: 'inicio' });
});

conectarBanco().then(() => aplicacao.listen(portaServidor, enderecoServidor));

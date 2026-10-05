const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = 3000;
const ENDERECO = '0.0.0.0';

const tiposDeConteudo = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function servirArquivo(res, caminhoArquivo) {
  const caminhoCompleto = path.join(__dirname, caminhoArquivo);
  fs.readFile(caminhoCompleto, (erro, dados) => {
    if (erro) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }

    const extensao = path.extname(caminhoCompleto);
    const tipoDeConteudo = tiposDeConteudo[extensao] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipoDeConteudo });
    res.end(dados);
  });
}

const servidor = http.createServer((req, res) => {
  let caminho = req.url === '/' ? '/inicio.html' : req.url;

  if (caminho.includes('..')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Caminho inválido');
    return;
  }

  if (caminho.startsWith('/public/')) {
    servirArquivo(res, caminho);
    return;
  }

  if (caminho.endsWith('.html')) {
    servirArquivo(res, caminho);
    return;
  }

  servirArquivo(res, caminho);
});

servidor.listen(PORTA, ENDERECO);

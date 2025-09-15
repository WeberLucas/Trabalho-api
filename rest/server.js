// API REST com autenticação e transferência de valores
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { usuarios, autenticar, listarUsuarios, criarUsuario, transferir } = require('../src/controller');

const SECRET = 'segredo_super_secreto';

const path = require('path');

const app = express();
app.use(bodyParser.json());

// Tenta carregar swagger-ui-express apenas se estiver instalado
try {
  // eslint-disable-next-line global-require
  const swaggerUi = require('swagger-ui-express');
  // eslint-disable-next-line global-require
  const swaggerDocument = require('../swagger.json');
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  // Se não estiver instalado, montaremos uma versão mínima da UI em /docs usando CDN
  // (não impede o servidor de iniciar)
}

// Sempre exponha a rota /swagger.json para que a UI (CDN) consiga buscar a spec
app.get('/swagger.json', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'swagger.json'));
});

// Fallback: página HTML que usa swagger-ui-dist via CDN se o pacote local não existir.
// Este handler é adicionado depois do possível middleware `swagger-ui-express`,
// então será usado apenas quando este não estiver presente.
app.get('/docs', (req, res) => {
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Docs Swagger</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        const ui = SwaggerUIBundle({
          url: '/swagger.json',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'BaseLayout'
        });
        window.ui = ui;
      };
    </script>
  </body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ mensagem: 'Token não fornecido' });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ mensagem: 'Token inválido' });
    req.user = user;
    next();
  });
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const usuario = autenticar(username, password);
  if (!usuario) {
    return res.status(401).json({ mensagem: 'Usuário ou senha inválidos' });
  }
  const token = jwt.sign({ username: usuario.username, id: usuario.id }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/usuarios', autenticarToken, (req, res) => {
  res.json(listarUsuarios());
});

app.post('/usuarios', autenticarToken, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ mensagem: 'Username e password são obrigatórios' });
  }
  try {
  const saldo = req.body.saldo;
  const novoUsuario = criarUsuario(username, password, saldo);
    res.status(201).json(novoUsuario);
  } catch (err) {
    if (err.message === 'Usuário já existe') {
      return res.status(409).json({ mensagem: err.message });
    }
    res.status(500).json({ mensagem: 'Erro ao criar usuário' });
  }
});

app.post('/transferir', autenticarToken, (req, res) => {
  const tokenOrigem = req.user.username;
  // permitir passar origem no corpo (por exemplo via Swagger) ou usar o token
  const { origem: corpoOrigem, destino, valor } = req.body;
  const origem = corpoOrigem || tokenOrigem;
  if (!destino || typeof valor !== 'number') {
    return res.status(400).json({ mensagem: 'Destino e valor são obrigatórios' });
  }
  try {
    const resultado = transferir(origem, destino, valor);
    res.json(resultado);
  } catch (err) {
    if (err.message === 'Usuário não encontrado') {
      return res.status(404).json({ mensagem: err.message });
    }
    if (err.message === 'Saldo insuficiente' || err.message === 'Valor inválido') {
      return res.status(400).json({ mensagem: err.message });
    }
    res.status(500).json({ mensagem: 'Erro na transferência' });
  }
});

if (require.main === module) {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Servidor REST rodando na porta ${PORT}`);
  });
}

module.exports = app;

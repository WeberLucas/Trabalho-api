// API GraphQL usando Apollo Server (exemplo didático)
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { usuarios, autenticar, listarUsuarios, criarUsuario, transferir } = require('../src/controller');

const SECRET = 'segredo_super_secreto';

const typeDefs = `
  type Usuario {
    id: Int
    username: String
    saldo: Float
  }
  type Transferencia {
  origem: String
  destino: String
  saldoOrigem: Float
  saldoDestino: Float
  }
  type Query {
    usuarios: [Usuario]
  }
  type Mutation {
    login(username: String!, password: String!): String
  criarUsuario(username: String!, password: String!, saldo: Float): Usuario
  transferir(origem: String, destino: String!, valor: Float!): Transferencia
  }
`;

const resolvers = {
  Query: {
    usuarios: (parent, args, context) => {
      const req = context.req;
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) throw new Error('Token não fornecido');
      try {
        jwt.verify(token, SECRET);
      } catch {
        throw new Error('Token inválido');
      }
      return listarUsuarios();
    }
  },
  Mutation: {
    login: (parent, { username, password }) => {
      const usuario = autenticar(username, password);
      if (!usuario) throw new Error('Usuário ou senha inválidos');
      return jwt.sign({ username: usuario.username, id: usuario.id }, SECRET, { expiresIn: '1h' });
    },
    criarUsuario: (parent, { username, password }, context) => {
      const req = context.req;
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) throw new Error('Token não fornecido');
      try {
        jwt.verify(token, SECRET);
      } catch {
        throw new Error('Token inválido');
      }
  const saldo = context.req.body && context.req.body.saldo;
  return criarUsuario(username, password, saldo);
    },
    transferir: (parent, { destino, valor }, context) => {
      const req = context.req;
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) throw new Error('Token não fornecido');
      let origem;
      try {
        const decoded = jwt.verify(token, SECRET);
        origem = decoded.username;
      } catch {
        throw new Error('Token inválido');
      }
  const origemPassada = context.req.body && context.req.body.origem;
  return transferir(origemPassada || origem, destino, valor);
    }
  }
};

const app = express();
app.use(bodyParser.json());

async function initApollo() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use('/graphql', expressMiddleware(server, { context: async ({ req }) => ({ req }) }));
}

// Start Apollo middleware (errors are logged)
initApollo().catch(err => console.error('Erro iniciando Apollo:', err));

if (require.main === module) {
  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`Servidor Apollo GraphQL rodando na porta ${PORT}`);
  });
}

module.exports = app;

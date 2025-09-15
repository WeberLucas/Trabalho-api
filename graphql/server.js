// Re-export Apollo-based GraphQL app (implementação alternativa);
// mantém o mesmo caminho `graphql/server.js` para compatibilidade com testes.
// API GraphQL com autenticação e transferência de valores
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { usuarios, autenticar, listarUsuarios, criarUsuario, transferir } = require('../src/controller');

const SECRET = 'segredo_super_secreto';

const schema = buildSchema(`
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
`);

const root = {
	usuarios: (args, context) => {
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
	},
	login: ({ username, password }) => {
		const usuario = autenticar(username, password);
		if (!usuario) throw new Error('Usuário ou senha inválidos');
		return jwt.sign({ username: usuario.username, id: usuario.id }, SECRET, { expiresIn: '1h' });
	},
	criarUsuario: ({ username, password }, context) => {
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
	transferir: ({ destino, valor }, context) => {
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
		// permitir origem opcional passada na mutation; usar token se não fornecida
		const origemPassada = context.req.body && context.req.body.origem;
		return transferir(origemPassada || origem, destino, valor);
	}
};

const app = express();
app.use(bodyParser.json());
app.use('/graphql', graphqlHTTP((req) => ({
	schema: schema,
	rootValue: root,
	graphiql: true,
	context: { req }
})));

if (require.main === module) {
	const PORT = 4000;
	app.listen(PORT, () => {
		console.log(`Servidor GraphQL rodando na porta ${PORT}`);
	});
}

module.exports = app;

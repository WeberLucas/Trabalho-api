// Testes da API GraphQL usando Mocha, Chai e Supertest
const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const app = require('./server');

describe('API GraphQL', () => {
  let token = '';
  beforeEach(() => {
    // Reseta estado compartilhado antes de cada caso
    require('../src/controller').reset();
  });

  it('Deve fazer login e receber token', async () => {
    const query = `mutation { login(username: \"admin\", password: \"1234\") }`;
    const res = await request(app)
      .post('/graphql')
      .send({ query });
    expect(res.status).to.equal(200);
    expect(res.body.data.login).to.be.a('string');
    token = res.body.data.login;
  });

  it('Deve listar usuários autenticado', async () => {
    const query = `{ usuarios { id username saldo } }`;
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query });
    expect(res.status).to.equal(200);
    expect(res.body.data.usuarios).to.be.an('array');
  });

  it('Deve cadastrar novo usuário', async () => {
    const mutation = `mutation { criarUsuario(username: \"graphql\", password: \"senha\") { id username saldo } }`;
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: mutation });
    expect(res.status).to.equal(200);
    expect(res.body.data.criarUsuario).to.have.property('username', 'graphql');
  });

  it('Deve transferir valor entre usuários', async () => {
    // Garante que o usuário destino exista
    const criar = `mutation { criarUsuario(username: \"graphql\", password: \"senha\") { id username } }`;
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: criar });

    const mutation = `mutation { transferir(destino: \"graphql\", valor: 10) { saldoOrigem saldoDestino } }`;
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: mutation });
    expect(res.status).to.equal(200);
    expect(res.body.data.transferir).to.have.property('saldoOrigem');
    expect(res.body.data.transferir).to.have.property('saldoDestino');
  });
});

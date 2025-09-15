// Testes da API REST usando Mocha, Chai e Supertest
const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const app = require('./server');

describe('API REST', () => {
  let token = '';
  beforeEach(() => {
    // Reseta estado compartilhado antes de cada caso
    require('../src/controller').reset();
  });

  it('Deve fazer login e receber token', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'admin', password: '1234' });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
    token = res.body.token;
  });

  it('Deve listar usuários autenticado', async () => {
    const res = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('Deve cadastrar novo usuário', async () => {
    const res = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'rest', password: 'senha' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('username', 'rest');
  });

  it('Deve transferir valor entre usuários', async () => {
    // Garante que o usuário destino exista
    await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'rest', password: 'senha' });

    const res = await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send({ destino: 'rest', valor: 10 });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('saldoOrigem');
    expect(res.body).to.have.property('saldoDestino');
  });
});

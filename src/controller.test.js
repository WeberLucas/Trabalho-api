// Testes unitários do controller usando Mocha, Chai e Sinon
const { expect } = require('chai');
const sinon = require('sinon');
const controller = require('./controller');

describe('Controller de Usuários', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    // Reseta o estado para evitar interdependência entre testes
    controller.reset();
  });

  it('autenticar deve retornar usuário válido', () => {
    const user = controller.autenticar('admin', '1234');
    expect(user).to.have.property('username', 'admin');
  });

  it('autenticar deve retornar undefined para usuário inválido', () => {
    const user = controller.autenticar('admin', 'errado');
    expect(user).to.be.undefined;
  });

  it('listarUsuarios deve retornar lista sem senha', () => {
    const lista = controller.listarUsuarios();
    expect(lista[0]).to.not.have.property('password');
  });

  it('criarUsuario deve adicionar novo usuário', () => {
    const spy = sinon.spy(controller, 'criarUsuario');
    const novo = controller.criarUsuario('teste', 'senha');
    expect(novo).to.have.property('username', 'teste');
    expect(spy.calledOnce).to.be.true;
  });

  it('criarUsuario deve lançar erro se usuário já existe', () => {
    expect(() => controller.criarUsuario('admin', '1234')).to.throw('Usuário já existe');
  });

  describe('Transferência de valores', () => {
    beforeEach(() => {
      // reset() já é chamado no beforeEach global do arquivo; recria destino e saldo do admin
      if (!controller.usuarios.find(u => u.username === 'destino')) {
        controller.criarUsuario('destino', 'senha');
      }
      const admin = controller.usuarios.find(u => u.username === 'admin');
      admin.saldo = 1000;
    });

    it('deve transferir valor entre usuários', () => {
      const spy = sinon.spy(controller, 'transferir');
      const resultado = controller.transferir('admin', 'destino', 100);
      expect(resultado.saldoOrigem).to.equal(900);
      expect(resultado.saldoDestino).to.be.a('number');
      expect(spy.calledOnce).to.be.true;
    });

    it('não deve transferir se saldo insuficiente', () => {
      const admin = controller.usuarios.find(u => u.username === 'admin');
      admin.saldo = 10;
      expect(() => controller.transferir('admin', 'destino', 100)).to.throw('Saldo insuficiente');
    });

    it('não deve transferir para usuário inexistente', () => {
      expect(() => controller.transferir('admin', 'fantasma', 10)).to.throw('Usuário não encontrado');
    });

    it('não deve transferir valor inválido', () => {
      expect(() => controller.transferir('admin', 'destino', -5)).to.throw('Valor inválido');
    });
  });
});

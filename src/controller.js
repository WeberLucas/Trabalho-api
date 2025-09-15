// Controller com lógica de negócio compartilhada
// Estado inicial dos usuários em memória
let usuarios = [];

const initialState = () => ([
  { id: 1, username: 'admin', password: '1234', saldo: 1000 }
]);

// Reseta o estado para o valor inicial (útil para testes)
function reset() {
  // Mantém a mesma referência de array (importantíssimo para testes que usam controller.usuarios)
  const init = initialState();
  usuarios.length = 0;
  init.forEach(u => usuarios.push(u));
}

// Inicializa o estado na carga do módulo
reset();

function autenticar(username, password) {
  return usuarios.find(u => u.username === username && u.password === password);
}

function listarUsuarios() {
  return usuarios.map(u => ({ id: u.id, username: u.username, saldo: u.saldo }));
}

function criarUsuario(username, password, saldo = 0) {
  if (usuarios.find(u => u.username === username)) {
    throw new Error('Usuário já existe');
  }
  const novoUsuario = { id: usuarios.length + 1, username, password, saldo: Number(saldo) || 0 };
  usuarios.push(novoUsuario);
  return { id: novoUsuario.id, username: novoUsuario.username, saldo: novoUsuario.saldo };
}

function transferir(origemUsername, destinoUsername, valor) {
  if (valor <= 0) throw new Error('Valor inválido');
  const origem = usuarios.find(u => u.username === origemUsername);
  const destino = usuarios.find(u => u.username === destinoUsername);
  if (!origem || !destino) throw new Error('Usuário não encontrado');
  if (origem.saldo < valor) throw new Error('Saldo insuficiente');
  origem.saldo -= valor;
  destino.saldo += valor;
  // Retornar também informações de quem enviou e quem recebeu
  return {
    origem: origem.username,
    destino: destino.username,
    saldoOrigem: origem.saldo,
    saldoDestino: destino.saldo
  };
}

module.exports = { usuarios, autenticar, listarUsuarios, criarUsuario, transferir, reset };

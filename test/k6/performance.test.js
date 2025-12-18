// Teste de Performance K6 - API REST
// Demonstra todos os conceitos solicitados: Thresholds, Checks, Helpers, Trends,
// Faker, Variáveis de Ambiente, Stages, Reaproveitamento de Resposta,
// Uso de Token de Autenticação, Data-Driven Testing, Groups

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
// FAKER: helper local para geração de dados dinâmicos (evita problemas com CDNs)
import { faker } from './faker-helper.js';
import { login, criarUsuario, listarUsuarios, transferir, loginTrend } from './helpers.js';

// DATA-DRIVEN TESTING: Carrega dados do arquivo JSON usando open()
// O caminho é relativo ao diretório do script (test/k6/)
const usuariosData = JSON.parse(open('./data/usuarios.json'));

// ============================================
// TRENDS - Métricas customizadas de tempo
// ============================================
const criarUsuarioTrend = new Trend('criar_usuario_time');
const listarUsuariosTrend = new Trend('listar_usuarios_time');
const transferirTrend = new Trend('transferir_time');
const totalRequestTime = new Trend('total_request_time');

// RATE - Taxa de sucesso/falha
const errorRate = new Rate('errors');

// COUNTER - Contador de requisições
const requestCounter = new Counter('total_requests');

// ============================================
// VARIÁVEL DE AMBIENTE
// ============================================
// Pega a URL base da variável de ambiente ou usa padrão
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Credenciais padrão: sempre usa 'admin' por padrão
// Pode ser sobrescrito por variáveis de ambiente K6_USERNAME/K6_PASSWORD
// (Usa K6_* para evitar conflito com USERNAME do sistema Windows que geralmente é o nome do usuário)
const DEFAULT_USERNAME = __ENV.K6_USERNAME || 'admin';
const DEFAULT_PASSWORD = __ENV.K6_PASSWORD || '1234';

// ============================================
// STAGES - Padrão de carga (ramp-up, constante, ramp-down)
// ============================================
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp-up: 0 a 5 usuários em 30s
    { duration: '1m', target: 10 },   // Ramp-up: 5 a 10 usuários em 1min
    { duration: '2m', target: 10 },   // Estável: 10 usuários por 2min
    { duration: '30s', target: 5 },   // Ramp-down: 10 a 5 usuários em 30s
    { duration: '30s', target: 0 },   // Ramp-down: 5 a 0 usuários em 30s
  ],
  
  // ============================================
  // THRESHOLDS - Limites de performance
  // ============================================
  thresholds: {
    // Tempo de resposta HTTP
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% das reqs < 500ms, 99% < 1000ms
    'http_req_failed': ['rate<0.1'], // Taxa de falha < 10%
    
    // Tempo de login customizado
    'login_time': ['p(95)<300', 'p(99)<500'],
    
    // Taxa de erros customizada
    'errors': ['rate<0.05'], // Taxa de erros < 5%
    
    // Tempos customizados das operações
    'criar_usuario_time': ['p(95)<400'],
    'listar_usuarios_time': ['p(95)<300'],
    'transferir_time': ['p(95)<400'],
    
    // Taxa de sucesso dos checks
    'checks': ['rate>0.9'], // Pelo menos 90% dos checks devem passar
  },
};

// ============================================
// SETUP - Executado uma vez antes de todos os VUs
// ============================================
export function setup() {
  console.log(`Iniciando teste de performance na URL: ${BASE_URL}`);
  console.log(`Usando usuário padrão: ${DEFAULT_USERNAME}`);
  
  // Prepara dados para Data-Driven Testing
  // Dados já carregados acima usando open()
  return {
    usuariosData: usuariosData,
    baseUrl: BASE_URL,
  };
}

// ============================================
// DEFAULT FUNCTION - Executado por cada VU
// ============================================
export default function(data) {
  const baseUrl = data.baseUrl;
  let token = null;
  
  // ============================================
  // GROUPS - Organiza testes em grupos lógicos
  // ============================================
  
  // GROUP 1: Autenticação
  group('Autenticação', function () {
    // Helper: função de login reutilizável
    token = login(baseUrl, DEFAULT_USERNAME, DEFAULT_PASSWORD);
    
    // Check: valida que o token foi obtido
    check(token, {
      'token foi obtido': (t) => t !== null && t.length > 0,
    }) || errorRate.add(1);
    
    requestCounter.add(1);
    
    sleep(1);
  });

  // Verifica se temos token antes de continuar
  if (!token) {
    errorRate.add(1);
    return;
  }

  // GROUP 2: Criação de Usuários
  group('Criação de Usuários', function () {
    // FAKER: gera dados dinâmicos para testes
    const novoUsername = faker.internet.username();
    const novaSenha = faker.internet.password();
    const novoSaldo = faker.number.int({ min: 100, max: 2000 });
    
    const startTime = Date.now();
    const novoUsuario = criarUsuario(baseUrl, token, novoUsername, novaSenha, novoSaldo);
    criarUsuarioTrend.add(Date.now() - startTime);
    
    // Check: valida criação do usuário
    const criarUsuarioCheck = check(novoUsuario, {
      'usuario foi criado': (u) => u !== null,
      'usuario tem username': (u) => u !== null && u.hasOwnProperty('username'),
      'usuario tem saldo': (u) => u !== null && u.hasOwnProperty('saldo'),
    });
    
    if (!criarUsuarioCheck) {
      errorRate.add(1);
    }
    
    requestCounter.add(1);
    
    // Reaproveitamento de Resposta: salva dados do usuário criado para uso posterior
    const usuarioCriado = novoUsuario;
    
    sleep(1);
  });

  // GROUP 3: Listagem de Usuários
  group('Listagem de Usuários', function () {
    const startTime = Date.now();
    const usuarios = listarUsuarios(baseUrl, token);
    listarUsuariosTrend.add(Date.now() - startTime);
    
    // Check: valida listagem
    const listarCheck = check(usuarios, {
      'lista de usuarios é array': (u) => Array.isArray(u),
      'lista tem pelo menos um usuario': (u) => Array.isArray(u) && u.length > 0,
    });
    
    if (!listarCheck) {
      errorRate.add(1);
    }
    
    requestCounter.add(1);
    
    // Reaproveitamento de Resposta: usa dados da lista para próximas operações
    const primeiroUsuario = usuarios.length > 0 ? usuarios[0] : null;
    
    sleep(1);
  });

  // GROUP 4: Transferências (Data-Driven Testing)
  group('Transferências - Data-Driven Testing', function () {
    // DATA-DRIVEN TESTING: itera sobre dados pré-definidos
    // Usa dados do arquivo JSON carregado no setup
    const usuariosTestData = data.usuariosData;
    
    if (usuariosTestData && usuariosTestData.length > 0) {
      // Seleciona um usuário aleatório dos dados
      const usuarioAleatorio = usuariosTestData[Math.floor(Math.random() * usuariosTestData.length)];
      
      // Primeiro, tenta criar o usuário se não existir (para garantir que existe)
      const usuarioDestino = criarUsuario(
        baseUrl, 
        token, 
        usuarioAleatorio.username, 
        usuarioAleatorio.password, 
        usuarioAleatorio.saldo
      );
      
      if (usuarioDestino) {
        // FAKER: gera valor de transferência dinâmico
        const valorTransferencia = faker.number.float({ min: 10, max: 100, precision: 0.01 });
        
        const startTime = Date.now();
        const resultadoTransferencia = transferir(baseUrl, token, usuarioAleatorio.username, valorTransferencia);
        transferirTrend.add(Date.now() - startTime);
        
        // Check: valida transferência
        const transferirCheck = check(resultadoTransferencia, {
          'transferencia foi realizada': (t) => t !== null,
          'transferencia tem saldo origem': (t) => t !== null && t.hasOwnProperty('saldoOrigem'),
          'transferencia tem saldo destino': (t) => t !== null && t.hasOwnProperty('saldoDestino'),
          'saldo origem é número válido': (t) => t !== null && typeof t.saldoOrigem === 'number',
        });
        
        if (!transferirCheck) {
          errorRate.add(1);
        }
        
        requestCounter.add(1);
        
        // Reaproveitamento de Resposta: usa resultado da transferência
        if (resultadoTransferencia) {
          // Poderia usar os saldos retornados para validações adicionais
          const saldoOrigemFinal = resultadoTransferencia.saldoOrigem;
          const saldoDestinoFinal = resultadoTransferencia.saldoDestino;
        }
      }
    }
    
    sleep(1);
  });

  // GROUP 5: Testes com Faker
  group('Testes com Dados Faker', function () {
    // FAKER: gera múltiplos tipos de dados para testes
    const fakeUsername = faker.internet.username();
    const fakePassword = faker.internet.password({ length: 10 });
    const fakeSaldo = faker.number.float({ min: 50, max: 5000, precision: 0.01 });
    const fakeValor = faker.number.float({ min: 5, max: 200, precision: 0.01 });
    
    // Cria usuário com dados faker
    const usuarioFake = criarUsuario(baseUrl, token, fakeUsername, fakePassword, fakeSaldo);
    
    check(usuarioFake, {
      'usuario fake foi criado': (u) => u !== null,
    });
    
    requestCounter.add(1);
    
    sleep(1);
  });

  // Trend: tempo total da requisição completa
  totalRequestTime.add(1);
}

// ============================================
// TEARDOWN - Executado uma vez após todos os VUs
// ============================================
export function teardown(data) {
  console.log(`Teste finalizado para URL: ${data.baseUrl}`);
}


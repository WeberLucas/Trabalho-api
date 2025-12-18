// Helpers - Funções reutilizáveis para os testes K6
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

// Trend customizada para medir tempo de login
export const loginTrend = new Trend('login_time');

/**
 * Helper: Realiza login e retorna o token de autenticação
 * Demonstra: Helpers, Uso de Token de Autenticação, Reaproveitamento de Resposta
 * 
 * @param {string} baseUrl - URL base da API
 * @param {string} username - Nome de usuário
 * @param {string} password - Senha
 * @returns {string|null} Token JWT ou null se falhar
 */
export function login(baseUrl, username, password) {
  const loginStartTime = Date.now();
  
  const loginPayload = JSON.stringify({
    username: username,
    password: password
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${baseUrl}/login`, loginPayload, params);
  
  // Trend: mede o tempo de resposta do login
  loginTrend.add(Date.now() - loginStartTime);
  
  // Check: valida se o login foi bem-sucedido
  const loginSuccess = check(response, {
    'login status é 200': (r) => r.status === 200,
    'login retorna token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('token') && body.token.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (loginSuccess) {
    const body = JSON.parse(response.body);
    // Reaproveitamento de Resposta: retorna o token da resposta para uso posterior
    return body.token;
  }
  
  return null;
}

/**
 * Helper: Cria um novo usuário na API
 * Demonstra: Helpers, Reaproveitamento de Resposta
 * 
 * @param {string} baseUrl - URL base da API
 * @param {string} token - Token de autenticação
 * @param {string} username - Nome de usuário
 * @param {string} password - Senha
 * @param {number} saldo - Saldo inicial
 * @returns {object|null} Objeto com dados do usuário criado ou null se falhar
 */
export function criarUsuario(baseUrl, token, username, password, saldo = 0) {
  const payload = JSON.stringify({
    username: username,
    password: password,
    saldo: saldo
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };

  const response = http.post(`${baseUrl}/usuarios`, payload, params);
  
  const success = check(response, {
    'criar usuario status é 201': (r) => r.status === 201,
    'criar usuario retorna username': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('username');
      } catch {
        return false;
      }
    },
  });

  if (success) {
    // Reaproveitamento de Resposta: retorna os dados do usuário criado
    return JSON.parse(response.body);
  }
  
  return null;
}

/**
 * Helper: Lista todos os usuários
 * Demonstra: Helpers
 * 
 * @param {string} baseUrl - URL base da API
 * @param {string} token - Token de autenticação
 * @returns {array} Array de usuários
 */
export function listarUsuarios(baseUrl, token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  };

  const response = http.get(`${baseUrl}/usuarios`, params);
  
  check(response, {
    'listar usuarios status é 200': (r) => r.status === 200,
    'listar usuarios retorna array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  try {
    return JSON.parse(response.body);
  } catch {
    return [];
  }
}

/**
 * Helper: Realiza transferência entre usuários
 * Demonstra: Helpers, Reaproveitamento de Resposta
 * 
 * @param {string} baseUrl - URL base da API
 * @param {string} token - Token de autenticação
 * @param {string} destino - Username do destinatário
 * @param {number} valor - Valor a transferir
 * @returns {object|null} Objeto com resultado da transferência ou null se falhar
 */
export function transferir(baseUrl, token, destino, valor) {
  const payload = JSON.stringify({
    destino: destino,
    valor: valor
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };

  const response = http.post(`${baseUrl}/transferir`, payload, params);
  
  const success = check(response, {
    'transferir status é 200': (r) => r.status === 200,
    'transferir retorna saldos': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('saldoOrigem') && body.hasOwnProperty('saldoDestino');
      } catch {
        return false;
      }
    },
  });

  if (success) {
    // Reaproveitamento de Resposta: retorna os dados da transferência
    return JSON.parse(response.body);
  }
  
  return null;
}



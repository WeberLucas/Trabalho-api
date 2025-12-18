// Helper Faker - Geração de dados dinâmicos para testes
// Demonstra o conceito de Faker sem depender de CDNs externos
// Este helper fornece funcionalidades similares ao @faker-js/faker

// Gera um número aleatório inteiro entre min e max (inclusive)
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gera um número aleatório float entre min e max com precisão opcional
export function randomFloat(min, max, precision = 2) {
  const random = Math.random() * (max - min) + min;
  return parseFloat(random.toFixed(precision));
}

// Gera um username aleatório
export function randomUsername() {
  const adjectives = ['quick', 'bold', 'smart', 'cool', 'bright', 'swift', 'brave', 'calm'];
  const nouns = ['tiger', 'eagle', 'wolf', 'lion', 'fox', 'bear', 'hawk', 'falcon'];
  const numbers = randomInt(100, 9999);
  const adj = adjectives[randomInt(0, adjectives.length - 1)];
  const noun = nouns[randomInt(0, nouns.length - 1)];
  return `${adj}_${noun}_${numbers}`;
}

// Gera uma senha aleatória
export function randomPassword(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomInt(0, chars.length - 1)];
  }
  return password;
}

// Gera um email aleatório
export function randomEmail() {
  const domains = ['example.com', 'test.com', 'demo.org', 'sample.net', 'mock.io'];
  const username = randomUsername();
  const domain = domains[randomInt(0, domains.length - 1)];
  return `${username}@${domain}`;
}

// Objeto faker compatível com a API do @faker-js/faker para facilitar migração
export const faker = {
  internet: {
    username: randomUsername,
    password: randomPassword,
    email: randomEmail,
  },
  number: {
    int: (options) => {
      const min = options?.min || 0;
      const max = options?.max || 100;
      return randomInt(min, max);
    },
    float: (options) => {
      const min = options?.min || 0;
      const max = options?.max || 100;
      const precision = options?.precision || 2;
      return randomFloat(min, max, precision);
    },
  },
};



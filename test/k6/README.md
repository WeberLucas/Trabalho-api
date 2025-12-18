# Testes de Performance K6 - API REST

Este documento explica onde cada conceito solicitado foi aplicado no código dos testes de performance.

## Estrutura dos Arquivos

```
test/k6/
├── performance.test.js    # Script principal de testes
├── helpers.js             # Funções helper reutilizáveis
├── faker-helper.js        # Helper para geração de dados dinâmicos (Faker)
├── data/
│   └── usuarios.json      # Dados para Data-Driven Testing
└── README.md              # Este arquivo
```

---

## Conceitos Aplicados

### 1. **Thresholds** (Limites de Performance)

**Localização:** `performance.test.js`, linhas 46-67

**Código:**
```javascript
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
}
```

**Explicação:** Os thresholds definem limites de performance que o teste deve atender. Se algum threshold não for atingido, o teste será marcado como falho. Aqui definimos limites para:
- Tempo de resposta HTTP (percentis 95 e 99)
- Taxa de falha de requisições HTTP
- Tempos customizados das operações (login, criar usuário, etc.)
- Taxa de erros geral
- Taxa de sucesso dos checks

---

### 2. **Checks** (Validações)

**Localização:** Múltiplos locais

**Exemplo 1 - Helpers:** `helpers.js`, linhas 31-38
```javascript
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
```

**Exemplo 2 - Teste principal:** `performance.test.js`, linhas 97-100
```javascript
check(token, {
  'token foi obtido': (t) => t !== null && t.length > 0,
}) || errorRate.add(1);
```

**Exemplo 3 - Validação de transferência:** `performance.test.js`, linhas 181-186
```javascript
const transferirCheck = check(resultadoTransferencia, {
  'transferencia foi realizada': (t) => t !== null,
  'transferencia tem saldo origem': (t) => t !== null && t.hasOwnProperty('saldoOrigem'),
  'transferencia tem saldo destino': (t) => t !== null && t.hasOwnProperty('saldoDestino'),
  'saldo origem é número válido': (t) => t !== null && typeof t.saldoOrigem === 'number',
});
```

**Explicação:** Checks são validações que verificam se as respostas da API estão corretas. Cada check retorna `true` ou `false`, e os resultados são coletados para calcular a taxa de sucesso (usado no threshold `'checks': ['rate>0.9']`).

---

### 3. **Helpers** (Funções Reutilizáveis)

**Localização:** `helpers.js` (arquivo completo)

**Exemplo - Função login:** `helpers.js`, linhas 16-50
```javascript
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
    return body.token;
  }
  
  return null;
}
```

**Uso no teste principal:** `performance.test.js`, linha 96
```javascript
token = login(baseUrl, DEFAULT_USERNAME, DEFAULT_PASSWORD);
```

**Explicação:** Helpers são funções reutilizáveis que encapsulam lógica comum. No projeto, criamos helpers para:
- `login()` - Realiza login e retorna token
- `criarUsuario()` - Cria um novo usuário
- `listarUsuarios()` - Lista todos os usuários
- `transferir()` - Realiza transferência entre usuários

Essas funções são importadas e usadas no teste principal, evitando repetição de código.

---

### 4. **Trends** (Métricas Customizadas de Tempo)

**Localização:** `performance.test.js`, linhas 8-13 e uso em múltiplos locais

**Definição:** `performance.test.js`, linhas 8-13
```javascript
const criarUsuarioTrend = new Trend('criar_usuario_time');
const listarUsuariosTrend = new Trend('listar_usuarios_time');
const transferirTrend = new Trend('transferir_time');
const totalRequestTime = new Trend('total_request_time');
```

**Trend no helper:** `helpers.js`, linhas 3 e 30
```javascript
export const loginTrend = new Trend('login_time');
// ...
loginTrend.add(Date.now() - loginStartTime);
```

**Uso no teste principal:** `performance.test.js`, linha 120
```javascript
const startTime = Date.now();
const novoUsuario = criarUsuario(baseUrl, token, novoUsername, novaSenha, novoSaldo);
criarUsuarioTrend.add(Date.now() - startTime);
```

**Explicação:** Trends são métricas customizadas que medem tempos de execução. Elas coletam dados sobre a duração de operações específicas e permitem análise estatística (média, percentis, etc.). No código:
- `loginTrend` mede tempo de login (definida em helpers.js)
- `criarUsuarioTrend` mede tempo de criação de usuário
- `listarUsuariosTrend` mede tempo de listagem
- `transferirTrend` mede tempo de transferência

Essas trends são usadas nos thresholds para garantir performance adequada.

---

### 5. **Faker** (Geração de Dados Dinâmicos)

**Localização:** `performance.test.js`, linhas 5, 117-119, 157-158

**Import:** `performance.test.js`, linha 9
```javascript
// FAKER: helper local para geração de dados dinâmicos (evita problemas com CDNs)
import { faker } from './faker-helper.js';
```

**Implementação:** `faker-helper.js` (arquivo completo)
```javascript
// Helper que implementa funcionalidades similares ao @faker-js/faker
export const faker = {
  internet: {
    username: randomUsername,
    password: randomPassword,
    email: randomEmail,
  },
  number: {
    int: (options) => { ... },
    float: (options) => { ... },
  },
};
```

**Uso para criar usuário:** `performance.test.js`, linhas 126-128
```javascript
const novoUsername = faker.internet.username();
const novaSenha = faker.internet.password();
const novoSaldo = faker.number.int({ min: 100, max: 2000 });
```

**Uso para transferência:** `performance.test.js`, linha 167
```javascript
const valorTransferencia = faker.number.float({ min: 10, max: 100, precision: 0.01 });
```

**Uso em grupo específico:** `performance.test.js`, linhas 234-237
```javascript
const fakeUsername = faker.internet.username();
const fakePassword = faker.internet.password({ length: 10 });
const fakeSaldo = faker.number.float({ min: 50, max: 5000, precision: 0.01 });
const fakeValor = faker.number.float({ min: 5, max: 200, precision: 0.01 });
```

**Explicação:** Faker é usado para gerar dados dinâmicos e realistas durante os testes. Foi criado um helper local (`faker-helper.js`) que implementa funcionalidades similares ao @faker-js/faker, evitando problemas de compatibilidade com CDNs no K6. Isso permite:
- Testar com diferentes combinações de dados a cada execução
- Evitar conflitos por usar dados únicos
- Simular cenários mais próximos do uso real
- Funcionar de forma confiável sem depender de recursos externos

---

### 6. **Variável de Ambiente**

**Localização:** `performance.test.js`, linhas 43-48

**Código:**
```javascript
// Pega a URL base da variável de ambiente ou usa padrão
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Credenciais padrão (podem ser sobrescritas por variáveis de ambiente)
const DEFAULT_USERNAME = __ENV.USERNAME || 'admin';
const DEFAULT_PASSWORD = __ENV.PASSWORD || '1234';
```

**Explicação:** Variáveis de ambiente permitem configurar o teste sem modificar o código. Usando `__ENV.VARIAVEL`, podemos ler valores passados na execução do K6. Se não fornecidas, usamos valores padrão.

**Como usar:**
```bash
# Linux/Mac
k6 run --env BASE_URL=http://api.exemplo.com --env USERNAME=usuario performance.test.js

# Windows PowerShell
$env:BASE_URL="http://api.exemplo.com"; $env:USERNAME="usuario"; k6 run performance.test.js
```

---

### 7. **Stages** (Padrão de Carga)

**Localização:** `performance.test.js`, linhas 38-44

**Código:**
```javascript
stages: [
  { duration: '30s', target: 5 },   // Ramp-up: 0 a 5 usuários em 30s
  { duration: '1m', target: 10 },   // Ramp-up: 5 a 10 usuários em 1min
  { duration: '2m', target: 10 },   // Estável: 10 usuários por 2min
  { duration: '30s', target: 5 },   // Ramp-down: 10 a 5 usuários em 30s
  { duration: '30s', target: 0 },   // Ramp-down: 5 a 0 usuários em 30s
],
```

**Explicação:** Stages definem como a carga de usuários virtuais (VUs) varia ao longo do tempo. O padrão acima simula:
1. **Ramp-up inicial:** Aumenta gradualmente de 0 para 5 usuários (evita sobrecarga inicial)
2. **Ramp-up intermediário:** Aumenta para 10 usuários
3. **Carga constante:** Mantém 10 usuários por 2 minutos (testa estabilidade)
4. **Ramp-down:** Diminui gradualmente até zero (testa recuperação)

Isso simula melhor o comportamento real de uso da API.

---

### 8. **Reaproveitamento de Resposta**

**Localização:** Múltiplos locais

**Exemplo 1 - Helper login:** `helpers.js`, linhas 45-47
```javascript
if (loginSuccess) {
  const body = JSON.parse(response.body);
  // Reaproveitamento de Resposta: retorna o token da resposta para uso posterior
  return body.token;
}
```

**Exemplo 2 - Teste principal:** `performance.test.js`, linhas 96-100
```javascript
token = login(baseUrl, DEFAULT_USERNAME, DEFAULT_PASSWORD);
// ...
// Token é reutilizado em todas as requisições subsequentes
```

**Exemplo 3 - Dados de usuário criado:** `performance.test.js`, linha 128
```javascript
// Reaproveitamento de Resposta: salva dados do usuário criado para uso posterior
const usuarioCriado = novoUsuario;
```

**Exemplo 4 - Resultado de transferência:** `performance.test.js`, linhas 192-196
```javascript
// Reaproveitamento de Resposta: usa resultado da transferência
if (resultadoTransferencia) {
  // Poderia usar os saldos retornados para validações adicionais
  const saldoOrigemFinal = resultadoTransferencia.saldoOrigem;
  const saldoDestinoFinal = resultadoTransferencia.saldoDestino;
}
```

**Explicação:** Reaproveitamento de resposta significa usar dados retornados por uma requisição em requisições subsequentes. No código:
- O token obtido no login é reutilizado em todas as requisições autenticadas
- Dados de usuários criados são salvos para uso posterior
- Resultados de transferências são extraídos e podem ser usados para validações

---

### 9. **Uso de Token de Autenticação**

**Localização:** `helpers.js` (funções que usam token) e `performance.test.js` (obtenção e uso)

**Obtenção do token:** `performance.test.js`, linhas 95-96
```javascript
group('Autenticação', function () {
  token = login(baseUrl, DEFAULT_USERNAME, DEFAULT_PASSWORD);
```

**Uso do token em helpers:** `helpers.js`, linhas 76-82
```javascript
const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
};
```

**Validação do token:** `performance.test.js`, linhas 97-103
```javascript
check(token, {
  'token foi obtido': (t) => t !== null && t.length > 0,
}) || errorRate.add(1);

// Verifica se temos token antes de continuar
if (!token) {
  errorRate.add(1);
  return;
}
```

**Explicação:** O teste demonstra o padrão completo de autenticação JWT:
1. Faz login para obter o token
2. Valida que o token foi obtido
3. Usa o token no header `Authorization: Bearer <token>` em todas as requisições protegidas
4. Se o token não for obtido, o teste interrompe as operações protegidas

---

### 10. **Data-Driven Testing**

**Localização:** `performance.test.js`, linhas 6, 146-169 e arquivo `data/usuarios.json`

**Arquivo de dados:** `data/usuarios.json`
```json
[
  {
    "username": "usuario1",
    "password": "senha123",
    "saldo": 500
  },
  ...
]
```

**Carregamento dos dados:** `performance.test.js`, linha 14
```javascript
// DATA-DRIVEN TESTING: Carrega dados do arquivo JSON usando open()
// O caminho é relativo ao diretório do script (test/k6/)
const usuariosData = JSON.parse(open('./data/usuarios.json'));
```

**Passagem no setup:** `performance.test.js`, linha 80
```javascript
return {
  usuariosData: usuariosData, // Dados carregados do JSON
  baseUrl: BASE_URL,
};
```

**Uso no teste:** `performance.test.js`, linhas 146-169
```javascript
group('Transferências - Data-Driven Testing', function () {
  // DATA-DRIVEN TESTING: itera sobre dados pré-definidos
  // Usa dados do arquivo JSON carregado no setup
  const usuariosTestData = data.usuariosData;
  
  if (usuariosTestData && usuariosTestData.length > 0) {
    // Seleciona um usuário aleatório dos dados
    const usuarioAleatorio = usuariosTestData[Math.floor(Math.random() * usuariosTestData.length)];
    
    // Primeiro, tenta criar o usuário se não existir
    const usuarioDestino = criarUsuario(
      baseUrl, 
      token, 
      usuarioAleatorio.username, 
      usuarioAleatorio.password, 
      usuarioAleatorio.saldo
    );
    // ...
  }
});
```

**Explicação:** Data-Driven Testing usa dados externos (arquivo JSON) para alimentar os testes. No código:
- Dados são carregados uma vez no `setup()` e passados para cada VU
- Cada VU seleciona dados aleatórios do conjunto para usar nos testes
- Isso permite testar com múltiplos conjuntos de dados sem hardcoding

---

### 11. **Groups** (Grupos de Testes)

**Localização:** `performance.test.js`, múltiplos grupos

**Grupo 1 - Autenticação:** `performance.test.js`, linhas 93-105
```javascript
group('Autenticação', function () {
  token = login(baseUrl, DEFAULT_USERNAME, DEFAULT_PASSWORD);
  
  check(token, {
    'token foi obtido': (t) => t !== null && t.length > 0,
  }) || errorRate.add(1);
  
  requestCounter.add(1);
  
  sleep(1);
});
```

**Grupo 2 - Criação:** `performance.test.js`, linhas 110-135
```javascript
group('Criação de Usuários', function () {
  // ... código de criação
});
```

**Grupo 3 - Listagem:** `performance.test.js`, linhas 138-156
```javascript
group('Listagem de Usuários', function () {
  // ... código de listagem
});
```

**Grupo 4 - Transferências:** `performance.test.js`, linhas 159-196
```javascript
group('Transferências - Data-Driven Testing', function () {
  // ... código de transferências
});
```

**Grupo 5 - Faker:** `performance.test.js`, linhas 199-215
```javascript
group('Testes com Dados Faker', function () {
  // ... código usando faker
});
```

**Explicação:** Groups organizam testes em blocos lógicos. No K6, groups:
- Agrupam métricas relacionadas
- Permitem organização clara do código
- Facilitam análise de resultados por funcionalidade
- Cada grupo aparece separadamente nos relatórios

No código, temos 5 grupos que testam diferentes aspectos da API de forma organizada.

---

## Como Executar os Testes

### Pré-requisitos

1. Instalar K6: https://k6.io/docs/getting-started/installation/
2. Ter a API REST rodando (porta 3000 por padrão)

### Executar teste básico

```bash
k6 run test/k6/performance.test.js
```

### Executar com variáveis de ambiente

```bash
# Linux/Mac
k6 run --env BASE_URL=http://localhost:3000 --env USERNAME=admin test/k6/performance.test.js

# Windows PowerShell
$env:BASE_URL="http://localhost:3000"; $env:USERNAME="admin"; k6 run test/k6/performance.test.js
```

### Gerar relatório HTML

```bash
# Instalar k6-reporter
npm install -g k6-reporter

# Executar teste e gerar HTML
k6 run --out json=results.json test/k6/performance.test.js
k6-reporter results.json --output report.html
```

Ou usar a extensão oficial do K6 Cloud:
```bash
k6 run --out cloud test/k6/performance.test.js
```

---

## Métricas Coletadas

O teste coleta as seguintes métricas:

- **HTTP Metrics (padrão do K6):**
  - `http_req_duration` - Tempo de resposta HTTP
  - `http_req_failed` - Taxa de falha HTTP

- **Custom Trends:**
  - `login_time` - Tempo de login
  - `criar_usuario_time` - Tempo de criação de usuário
  - `listar_usuarios_time` - Tempo de listagem
  - `transferir_time` - Tempo de transferência
  - `total_request_time` - Tempo total da requisição

- **Custom Rates:**
  - `errors` - Taxa de erros

- **Custom Counters:**
  - `total_requests` - Total de requisições

- **Checks:**
  - Taxa de sucesso dos checks de validação

---

## Resumo da Aplicação dos Conceitos

| Conceito | Arquivo | Localização |
|----------|---------|-------------|
| **Thresholds** | `performance.test.js` | Linhas 46-67 |
| **Checks** | `helpers.js`, `performance.test.js` | Múltiplos locais |
| **Helpers** | `helpers.js` | Arquivo completo |
| **Trends** | `performance.test.js`, `helpers.js` | Linhas 8-13, uso em várias linhas |
| **Faker** | `performance.test.js`, `faker-helper.js` | Linhas 9, 126-128, 167, 234-237 |
| **Variável de Ambiente** | `performance.test.js` | Linhas 43-48 |
| **Stages** | `performance.test.js` | Linhas 38-44 |
| **Reaproveitamento de Resposta** | `helpers.js`, `performance.test.js` | Múltiplos locais |
| **Uso de Token de Autenticação** | `helpers.js`, `performance.test.js` | Múltiplos locais |
| **Data-Driven Testing** | `performance.test.js`, `data/usuarios.json` | Linhas 6, 75, 146-169 |
| **Groups** | `performance.test.js` | Linhas 93, 110, 138, 159, 199 |


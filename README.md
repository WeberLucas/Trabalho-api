# Trabalho de Conclusão da Disciplina - Testes de Performance K6

Este repositório contém uma implementação completa de testes de performance com K6 para uma API REST, demonstrando todos os conceitos solicitados: **Thresholds, Checks, Helpers, Trends, Faker, Variáveis de Ambiente, Stages, Reaproveitamento de Resposta, Uso de Token de Autenticação, Data-Driven Testing e Groups**.

## 📋 Sobre o Projeto

Este projeto implementa:
- **API REST** (pasta `rest/`) - API com autenticação JWT e operações de transferência
- **API GraphQL** (pasta `graphql/`) - Implementação GraphQL alternativa
- **Código compartilhado** (pasta `src/`) - Controller e lógica de negócio
- **Testes de Performance K6** (pasta `test/k6/`) - **Foco principal deste trabalho**

---

## 🚀 Quick Start - Testes K6

### Pré-requisitos

1. **Instalar K6:**
   ```powershell
   # Windows (PowerShell como Admin)
   choco install k6
   
   # Ou Linux/Mac
   # Ver instruções completas em test/k6/EXECUCAO.md
   ```

2. **Iniciar a API REST:**
   ```powershell
   node rest/server.js
   ```
   A API estará disponível em `http://localhost:3000`

3. **Executar os testes:**
   ```powershell
   npm run test:k6
   # Ou diretamente:
   k6 run test/k6/performance.test.js
   ```

---

## 📁 Estrutura do Projeto

```
.
├── rest/                    # API REST e seus testes
│   └── server.js           # Servidor REST (porta 3000)
├── graphql/                 # API GraphQL e seus testes
│   └── server.js           # Servidor GraphQL (porta 4000)
├── src/                     # Código compartilhado
│   └── controller.js       # Lógica de negócio
├── test/
│   └── k6/                  # ⭐ Testes de Performance K6
│       ├── performance.test.js    # Script principal
│       ├── helpers.js             # Funções helper
│       ├── faker-helper.js        # Helper Faker
│       ├── data/
│       │   └── usuarios.json      # Dados para Data-Driven Testing
│       ├── README.md              # Documentação técnica detalhada
│       └── EXECUCAO.md            # Guia de execução
├── .github/workflows/       # Pipeline CI/CD
└── package.json
```

---

## 🎯 Conceitos K6 Implementados

Este trabalho demonstra a aplicação de **todos os conceitos solicitados**. Abaixo está um resumo com localizações no código:

### 1. **Thresholds** (Limites de Performance)
**Localização:** `test/k6/performance.test.js`, linhas 52-70

Define limites de performance que devem ser atendidos:
```javascript
thresholds: {
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.1'],
  'login_time': ['p(95)<300', 'p(99)<500'],
  'errors': ['rate<0.05'],
  'checks': ['rate>0.9'],
}
```

### 2. **Checks** (Validações)
**Localização:** Múltiplos locais em `test/k6/helpers.js` e `performance.test.js`

Validações que verificam se as respostas estão corretas:
```javascript
check(response, {
  'login status é 200': (r) => r.status === 200,
  'login retorna token': (r) => {
    const body = JSON.parse(r.body);
    return body.hasOwnProperty('token');
  },
});
```

### 3. **Helpers** (Funções Reutilizáveis)
**Localização:** `test/k6/helpers.js` (arquivo completo)

Funções helper encapsulam lógica comum:
- `login()` - Autenticação e obtenção de token
- `criarUsuario()` - Criação de usuários
- `listarUsuarios()` - Listagem de usuários
- `transferir()` - Transferências entre usuários

### 4. **Trends** (Métricas Customizadas)
**Localização:** `test/k6/performance.test.js`, linhas 19-22

Métricas customizadas que medem tempos de execução:
```javascript
const criarUsuarioTrend = new Trend('criar_usuario_time');
const listarUsuariosTrend = new Trend('listar_usuarios_time');
const transferirTrend = new Trend('transferir_time');
```

### 5. **Faker** (Geração de Dados Dinâmicos)
**Localização:** `test/k6/faker-helper.js` e uso em `performance.test.js`

Helper local para gerar dados dinâmicos:
```javascript
const novoUsername = faker.internet.username();
const novaSenha = faker.internet.password();
const novoSaldo = faker.number.int({ min: 100, max: 2000 });
```

### 6. **Variável de Ambiente**
**Localização:** `test/k6/performance.test.js`, linhas 34-39

Configuração via variáveis de ambiente (usa `admin` como padrão):
```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DEFAULT_USERNAME = __ENV.K6_USERNAME || __ENV.USERNAME || 'admin';
const DEFAULT_PASSWORD = __ENV.K6_PASSWORD || __ENV.PASSWORD || '1234';
```

**Uso (opcional - padrão já é admin):**
```powershell
# Sem variáveis (usa admin/1234 por padrão)
k6 run test/k6/performance.test.js

# Ou para customizar
$env:K6_USERNAME="admin"; $env:K6_PASSWORD="1234"; k6 run test/k6/performance.test.js
```

### 7. **Stages** (Padrão de Carga)
**Localização:** `test/k6/performance.test.js`, linhas 44-49

Define como a carga varia ao longo do tempo:
```javascript
stages: [
  { duration: '30s', target: 5 },   // Ramp-up: 0 a 5 usuários
  { duration: '1m', target: 10 },   // Ramp-up: 5 a 10 usuários
  { duration: '2m', target: 10 },   // Estável: 10 usuários
  { duration: '30s', target: 5 },   // Ramp-down: 10 a 5
  { duration: '30s', target: 0 },   // Ramp-down: 5 a 0
],
```

### 8. **Reaproveitamento de Resposta**
**Localização:** Múltiplos locais

Reutilização de dados de respostas anteriores:
```javascript
// Token obtido no login é reutilizado
token = login(baseUrl, username, password);
// Token usado em requisições subsequentes
const usuarios = listarUsuarios(baseUrl, token);
```

### 9. **Uso de Token de Autenticação**
**Localização:** `test/k6/helpers.js` e `performance.test.js`

Padrão completo de autenticação JWT:
```javascript
// 1. Login para obter token
token = login(baseUrl, username, password);

// 2. Uso do token em headers
const params = {
  headers: {
    'Authorization': `Bearer ${token}`
  },
};
```

### 10. **Data-Driven Testing**
**Localização:** `test/k6/performance.test.js`, linha 15 e uso em linhas 176-196

Testes usando dados de arquivo JSON:
```javascript
// Carregamento dos dados
const usuariosData = JSON.parse(open('./data/usuarios.json'));

// Uso nos testes
const usuarioAleatorio = usuariosData[Math.floor(Math.random() * usuariosData.length)];
```

### 11. **Groups** (Grupos de Testes)
**Localização:** `test/k6/performance.test.js`, linhas 103, 124, 154, 177, 231

Organização dos testes em grupos lógicos:
```javascript
group('Autenticação', function () {
  token = login(baseUrl, username, password);
});

group('Criação de Usuários', function () {
  // ...
});

group('Listagem de Usuários', function () {
  // ...
});

group('Transferências - Data-Driven Testing', function () {
  // ...
});

group('Testes com Dados Faker', function () {
  // ...
});
```

---

## 📊 Resumo da Aplicação dos Conceitos

| Conceito | Arquivo | Localização |
|----------|---------|-------------|
| **Thresholds** | `performance.test.js` | Linhas 52-70 |
| **Checks** | `helpers.js`, `performance.test.js` | Múltiplos locais |
| **Helpers** | `helpers.js` | Arquivo completo |
| **Trends** | `performance.test.js`, `helpers.js` | Linhas 19-22, uso em várias linhas |
| **Faker** | `performance.test.js`, `faker-helper.js` | Linhas 10, 126-128, 167, 234-237 |
| **Variável de Ambiente** | `performance.test.js` | Linhas 34-38 |
| **Stages** | `performance.test.js` | Linhas 44-49 |
| **Reaproveitamento de Resposta** | `helpers.js`, `performance.test.js` | Múltiplos locais |
| **Uso de Token de Autenticação** | `helpers.js`, `performance.test.js` | Múltiplos locais |
| **Data-Driven Testing** | `performance.test.js`, `data/usuarios.json` | Linha 15, 176-196 |
| **Groups** | `performance.test.js` | Linhas 103, 124, 154, 177, 231 |

---

## 📈 Gerar Relatório HTML

Para gerar relatório HTML dos testes:

```powershell
# Instalar k6-reporter (opcional)
npm install -g k6-reporter

# Executar teste e gerar JSON
k6 run --out json=test/k6/results.json test/k6/performance.test.js

# Gerar HTML
k6-reporter test/k6/results.json --output test/k6/report.html
```

Ou usar K6 Cloud:
```powershell
k6 run --out cloud test/k6/performance.test.js
```

---

## 📚 Documentação Detalhada

Para informações mais detalhadas sobre cada conceito, incluindo trechos de código completos e explicações aprofundadas, consulte:

- **`test/k6/README.md`** - Documentação técnica completa com todos os trechos de código
- **`test/k6/EXECUCAO.md`** - Guia detalhado de execução e troubleshooting

---

## 🔧 Configuração da API

### Instalar Dependências

```powershell
npm install
```

### Executar API REST

```powershell
node rest/server.js
```

A API estará disponível em:
- **URL Base:** `http://localhost:3000`
- **Documentação Swagger:** `http://localhost:3000/docs`

### Credenciais Padrão

- **Username:** `admin`
- **Password:** `1234`

---

## 🧪 Outros Testes do Projeto

Além dos testes K6, o projeto possui:

```powershell
# Testes unitários e de integração
npm test              # Todos os testes
npm run test:rest     # Apenas testes REST
npm run test:graphql  # Apenas testes GraphQL
npm run test:unit     # Apenas testes unitários
```

---

## 📝 Estrutura da API REST

### Endpoints Disponíveis

- **POST /login** - Autenticação (retorna JWT token)
- **GET /usuarios** - Lista usuários (requer autenticação)
- **POST /usuarios** - Cria novo usuário (requer autenticação)
- **POST /transferir** - Transfere valor entre usuários (requer autenticação)

Todos os endpoints protegidos requerem header: `Authorization: Bearer <token>`

---


✅ **Relatório de Execução** pode ser gerado em HTML usando:
```powershell
k6 run --out json=results.json test/k6/performance.test.js
k6-reporter results.json --output report.html
```



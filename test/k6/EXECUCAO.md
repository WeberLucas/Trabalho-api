# Como Executar os Testes de Performance K6

## Pré-requisitos

### 1. Instalar K6

**Windows (PowerShell como Admin):**
```powershell
choco install k6
```

**Linux (Ubuntu/Debian):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS:**
```bash
brew install k6
```

Verificar instalação:
```bash
k6 version
```

### 2. Iniciar a API REST

Em um terminal separado, inicie a API REST:
```bash
node rest/server.js
```

A API deve estar rodando em `http://localhost:3000`

---

## Executar Testes

### Execução Básica

```bash
npm run test:k6
```

Ou diretamente:
```bash
k6 run test/k6/performance.test.js
```

### Execução com Variáveis de Ambiente

**Windows PowerShell:**
```powershell
$env:BASE_URL="http://localhost:3000"
$env:USERNAME="admin"
$env:PASSWORD="1234"
k6 run test/k6/performance.test.js
```

**Linux/Mac:**
```bash
BASE_URL=http://localhost:3000 USERNAME=admin k6 run test/k6/performance.test.js
```

### Execução com Diferentes Cargas

Para testar com mais usuários, edite o arquivo `performance.test.js` e modifique os `stages`:

```javascript
stages: [
  { duration: '1m', target: 20 },   // Até 20 usuários
  { duration: '2m', target: 20 },   // Mantém 20
  { duration: '1m', target: 0 },    // Reduz a 0
],
```

---

## Gerar Relatório HTML

### Opção 1: Usando k6-reporter (Recomendado)

Instalar k6-reporter:
```bash
npm install -g k6-reporter
```

Executar teste e gerar HTML:
```bash
npm run test:k6:html
k6-reporter test/k6/results.json --output test/k6/report.html
```

### Opção 2: Usando K6 Cloud (Gratuito)

Executar e enviar para K6 Cloud:
```bash
k6 run --out cloud test/k6/performance.test.js
```

Você precisará criar uma conta gratuita em https://k6.io

### Opção 3: Usando jq + HTML manual

Gerar JSON:
```bash
k6 run --out json=test/k6/results.json test/k6/performance.test.js
```

Processar com ferramentas como `jq` ou scripts customizados.

---

## Entendendo os Resultados

O K6 exibe resultados no console após a execução, incluindo:

- **http_req_duration**: Tempo de resposta das requisições HTTP
- **http_req_failed**: Taxa de falha das requisições
- **vus**: Número de usuários virtuais ativos
- **iterations**: Total de iterações executadas
- **data_sent/received**: Dados enviados e recebidos
- **Custom metrics**: Trends, rates e counters definidos no teste

### Exemplo de Saída:

```
     ✓ login status é 200
     ✓ login retorna token
     ✓ token foi obtido
     ...
     
     checks.........................: 95.00% ✓ 190      ✗ 10
     data_received..................: 45 kB  750 B/s
     data_sent......................: 35 kB  583 B/s
     http_req_duration..............: avg=125ms min=50ms med=120ms max=450ms p(90)=250ms p(95)=350ms
     http_req_failed................: 0.00%  ✓ 0        ✗ 200
     login_time.....................: avg=120ms min=45ms med=115ms max=420ms p(90)=240ms p(95)=320ms
     ...
```

---

## Troubleshooting

### Erro: "k6: command not found"
- Certifique-se de que o K6 está instalado e no PATH
- Reinicie o terminal após instalação

### Erro: "ECONNREFUSED"
- Verifique se a API REST está rodando na porta 3000
- Verifique se a URL está correta (use variável de ambiente BASE_URL se necessário)

### Erro: "401 Unauthorized"
- Verifique as credenciais (USERNAME e PASSWORD)
- Certifique-se de que o usuário 'admin' existe na API

### Thresholds falhando
- Ajuste os valores dos thresholds no arquivo `performance.test.js` se necessário
- Ou melhore a performance da API

---

## Dicas

1. **Para testes rápidos**, reduza a duração dos stages no `performance.test.js`
2. **Para testes mais intensos**, aumente o número de VUs (target) nos stages
3. **Para debug**, use `--http-debug` flag:
   ```bash
   k6 run --http-debug test/k6/performance.test.js
   ```
4. **Para executar apenas um grupo**, comente os outros grupos no código temporariamente
5. **Salve resultados** sempre para comparação:
   ```bash
   k6 run --out json=results-$(date +%Y%m%d-%H%M%S).json test/k6/performance.test.js
   ```



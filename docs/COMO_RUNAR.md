# Como rodar o projeto e exemplos de uso (PowerShell)

Este documento mostra como instalar dependências, rodar os servidores localmente (REST e GraphQL), executar os testes e exemplos de requisições em PowerShell (Windows PowerShell v5.1).

Observação: os servidores `rest/server.js` e `graphql/server.js` só iniciam automaticamente quando executados diretamente. Os testes importam os apps sem abrir portas.

## Instalar dependências
Abra um terminal (PowerShell) na pasta do projeto e execute:

```powershell
npm install
```

## Rodar os servidores (opcional, para teste manual)

- Rodar a API REST (porta 3000):

```powershell
node rest/server.js
```

- Rodar a API GraphQL (porta 4000):

```powershell
node graphql/server.js
```

> Se preferir não iniciar os servidores (os testes usam os apps diretamente), pule esta etapa.

## Executar testes
Roda todos os testes (REST, GraphQL e unitários):

```powershell
npm test
```

Ou rodar apenas um conjunto:

```powershell
npm run test:rest
npm run test:graphql
npm run test:unit
```

## Exemplos REST (PowerShell)

1) Login (obter token):

```powershell
$body = @{ username = 'admin'; password = '1234' } | ConvertTo-Json
$res = Invoke-RestMethod -Uri http://localhost:3000/login -Method Post -Body $body -ContentType 'application/json'
$token = $res.token
Write-Output "Token: $token"
```

2) Listar usuários (rota protegida):

```powershell
Invoke-RestMethod -Uri http://localhost:3000/usuarios -Headers @{ Authorization = "Bearer $token" } -Method Get
```

3) Cadastrar novo usuário:

```powershell
$body = @{ username = 'novo'; password = 'senha' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/usuarios -Headers @{ Authorization = "Bearer $token" } -Method Post -Body $body -ContentType 'application/json'
```

4) Transferir valor para outro usuário:

```powershell
$body = @{ destino = 'novo'; valor = 50 } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/transferir -Headers @{ Authorization = "Bearer $token" } -Method Post -Body $body -ContentType 'application/json'
```

## Exemplos GraphQL (PowerShell)

1) Obter token via mutation `login` (GraphQL):

```powershell
$query = '{ "query": "mutation { login(username: \"admin\", password: \"1234\") }" }'
$res = Invoke-RestMethod -Uri http://localhost:4000/graphql -Method Post -Body $query -ContentType 'application/json'
$token = $res.data.login
Write-Output "Token: $token"
```

2) Query `usuarios` (protegido):

```powershell
$query = '{ "query": "{ usuarios { id username saldo } }" }'
Invoke-RestMethod -Uri http://localhost:4000/graphql -Method Post -Body $query -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
```

3) Mutation `criarUsuario`:

```powershell
$mutation = '{ "query": "mutation { criarUsuario(username: \"graphql\", password: \"senha\") { id username saldo } }" }'
Invoke-RestMethod -Uri http://localhost:4000/graphql -Method Post -Body $mutation -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
```

4) Mutation `transferir`:

```powershell
$mutation = '{ "query": "mutation { transferir(destino: \"graphql\", valor: 10) { saldoOrigem saldoDestino } }" }'
Invoke-RestMethod -Uri http://localhost:4000/graphql -Method Post -Body $mutation -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
```

## Observações finais
- Para que o GitHub Actions rode os testes corretamente, basta commitar e dar push na branch `main`. O workflow (`.github/workflows/nodejs.yml`) executará `npm install` seguido de `npm test`.
- Se quiser eu deixo os exemplos em `rest/README.md` e `graphql/README.md` também, ou adiciono exemplos com `curl`/bash. Diga qual prefere.

# Trabalho de Conclusão – API REST e GraphQL

Este repositório contém:
- Uma API REST (pasta `rest/`)
- Uma API GraphQL (pasta `graphql/`)
- Código compartilhado em `src/`
- Testes automatizados para ambas as APIs
- Pipeline de testes automatizados (GitHub Actions)

Extras nesta versão:
- A API GraphQL tem uma implementação alternativa com Apollo Server em `graphql/apolloServer.js`.
- A API REST agora expõe documentação OpenAPI/Swagger em `/docs` (via `swagger-ui-express`).

## Estrutura
```
rest/        # API REST e seus testes
graphql/     # API GraphQL e seus testes
src/         # Código compartilhado (controller, modelos, etc)
.github/
  workflows/ # Pipeline de testes
.gitignore
README.md
package.json
```

## Como rodar
Veja instruções detalhadas em cada subpasta.

Instalar dependências adicionais (PowerShell):

```powershell
npm install @apollo/server @apollo/server-express4 swagger-ui-express swagger-jsdoc --save
```

Observações:
- Os testes continuam a executar os aplicativos diretamente importando `rest/server.js` e `graphql/server.js` (apenas a implementação Apollo é adicional).
- Para ver a documentação Swagger ao rodar a REST localmente, acesse http://localhost:3000/docs

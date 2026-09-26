# Teste de ponta a ponta

`fluxo-completo.mjs` semeia dados pela API (turmas, alunos, produtos, fornecedor, compra, operador) e percorre no
navegador: login, PDV com leitura de carteirinha e de produto, venda fiado e paga na hora, conferência de fichas e
caixa, conta do aluno com crédito, reconciliação, contagem de sobras e restrições do perfil operador. Screenshots
ficam em `e2e/shots/`.

Pré-requisitos: backend em `http://localhost:8081`, frontend em `http://localhost:4200` e o pacote `playwright`
instalado (`npm i -D playwright && npx playwright install chromium`).

```bash
cd frontend
node e2e/fluxo-completo.mjs
```

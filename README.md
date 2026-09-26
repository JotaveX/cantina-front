# Cantina (frontend)

Interface web do sistema da cantina escolar: ponto de venda com leitor de código de barras, conferência de fichas e caixa,
cadastros, estoque, conta do aluno, relatórios e painel (home do ADMIN).

- Angular 22 (componentes standalone, signals, zoneless), formulários reativos
- Sem biblioteca de UI: estilos próprios em `src/styles.scss`
- Deploy estático na Cloudflare Pages

## Rodando localmente

Pré-requisitos: Node 22+ e o backend rodando (veja `../backend/README.md`).

```bash
cd frontend
npm install
npm start          # http://localhost:4200
```

Em desenvolvimento as chamadas a `/api/**` passam pelo proxy do `ng serve` (`proxy.conf.json`) até o backend em
`http://localhost:8081`. Se a sua API estiver em outra porta, ajuste o `target` nesse arquivo.

Login inicial: `admin` / `admin123`.

### Leitor de código de barras

O leitor USB funciona como teclado: "digita" o código e envia Enter. O componente `app-scanner-input`
(`src/app/shared/scanner-input.component.ts`) mantém o foco no campo, trata o Enter e limpa o campo para a
próxima leitura. No PDV um único campo aceita carteirinha do aluno e código de produto, nessa ordem de
prioridade; no balcão o campo aceita só a carteirinha.

### Testes

```bash
npm test                                   # unitários (vitest)
```

O teste de ponta a ponta (Playwright, headless) que percorre login, PDV, conferência de fichas, conta do aluno, relatórios e
perfis está em `e2e/fluxo-completo.mjs`; veja `e2e/README.md`.

## Build e deploy (Cloudflare Pages)

```bash
API_URL=https://sua-api.up.railway.app npm run build
# saída em dist/frontend/browser
```

O script `scripts/set-env.mjs` roda antes do build (`prebuild`) e grava `src/environments/environment.prod.ts`
com a `API_URL` (o sufixo `/api` é acrescentado automaticamente). O arquivo `public/_redirects` faz todas as rotas
caírem no `index.html`, necessário para o roteamento do Angular.

Configuração na Cloudflare Pages:

| Campo | Valor |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist/frontend/browser` |
| Variável `API_URL` | URL pública do backend no Railway |
| Variável `NODE_VERSION` | `22` |

Depois, inclua a URL do Pages em `CORS_ALLOWED_ORIGINS` no backend.

## Estrutura

```
src/app
├── core/        modelos (DTOs), AuthService (JWT em localStorage), interceptors (token + toast de erro), guards, serviços de API
├── shared/      scanner-input, pipe de dinheiro, badges de status, toasts, helpers de data
├── layout/      shell com sidebar (menu filtrado por perfil)
└── features/
    ├── login, dashboard, pdv, conferencia (fichas recolhidas + caixa do dia)
    ├── cadastros/   alunos, turmas, produtos (+categorias), fornecedores, usuários, trocar senha
    ├── estoque/     compras, baixa manual, contagem de sobras
    ├── financeiro/  conta do aluno (extrato + lançamentos), vendas (lista + cancelamento)
    └── relatorios/  estoque, fichas por produto, carteirinhas, reconciliação, vendas por período, em atraso, fechamento mensal,
                     bilhetes de cobrança (impressão, 8 por folha A4), consumo do aluno
    └── documentos/  atalho (menu "Documentos") para consumo do aluno (documento impresso para os responsáveis),
                     bilhetes de cobrança e carteirinhas (frente + verso 20 × 7 cm, 4 por folha A4, papel azul;
                     Code 128 gerado em shared/code128.ts)
```

Configurações (dia do fechamento) ficam na engrenagem ao lado do nome do usuário, não no menu.

Perfis: rotas administrativas usam `adminGuard`; o menu esconde o que o operador não acessa e a API também bloqueia (403).

import { writeFileSync } from 'node:fs';

const base = (process.env.API_URL ?? 'https://cantina-api-514520320470.southamerica-east1.run.app/api').replace(/\/+$/, '');
const apiUrl = base.endsWith('/api') ? base : `${base}/api`;
const conteudo = `// Gerado automaticamente por scripts/set-env.mjs a partir da variável API_URL (npm run build).
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};
`;
writeFileSync(new URL('../src/environments/environment.prod.ts', import.meta.url), conteudo);
console.log(`[set-env] apiUrl de produção: ${apiUrl}`);

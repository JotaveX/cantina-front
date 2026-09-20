import { chromium } from 'playwright';

const API = 'http://localhost:8081/api';
const APP = 'http://localhost:4200';
const SHOTS = new URL('./shots/', import.meta.url).pathname; import('node:fs').then(fs => fs.mkdirSync(SHOTS, { recursive: true }));
const log = (...a) => console.log('[e2e]', ...a);
const falhas = [];
function check(cond, msg) { if (cond) log('OK  ', msg); else { log('FAIL', msg); falhas.push(msg); } }

// ---------- seed via API ----------
async function api(token, method, path, body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${txt}`);
  return data;
}
const { token } = await api(null, 'POST', '/auth/login', { login: 'admin', senha: 'admin123' });
const turmasExistentes = await api(token, 'GET', '/turmas');
const turma = turmasExistentes.find(t => t.nome === '5º A') ?? await api(token, 'POST', '/turmas', { nome: '5º A', serie: '5º ano' });
const turmaB = turmasExistentes.find(t => t.nome === '3º B') ?? await api(token, 'POST', '/turmas', { nome: '3º B', serie: '3º ano' });
const cats = await api(token, 'GET', '/categorias');
const catNome = async n => cats.find(c => c.nome === n) ?? api(token, 'POST', '/categorias', { nome: n });
const salgados = await catNome('Salgados'), bebidas = await catNome('Bebidas'), doces = await catNome('Doces');
const produtosExistentes = await api(token, 'GET', '/produtos?apenasAtivos=false');
async function produto(nome, categoriaId, preco, cb, estoque, minimo) {
  const ex = produtosExistentes.find(p => p.nome === nome);
  if (ex) return ex;
  return api(token, 'POST', '/produtos', { nome, categoriaId, preco, codigoBarras: cb, quantidadeEstoque: estoque, estoqueMinimo: minimo });
}
const coxinha = await produto('Coxinha de frango', salgados.id, 5.5, '7890000000011', 40, 10);
const pao = await produto('Pão de queijo', salgados.id, 3.0, '7890000000028', 60, 15);
const suco = await produto('Suco de laranja 300ml', bebidas.id, 4.0, '7890000000035', 30, 10);
const agua = await produto('Água mineral', bebidas.id, 2.5, '7890000000042', 8, 12);
const brigadeiro = await produto('Brigadeiro', doces.id, 2.0, '7890000000059', 50, 10);
const alunosExistentes = await api(token, 'GET', '/alunos?apenasAtivos=false');
async function aluno(nome, turmaId, resp, contato) {
  return alunosExistentes.find(a => a.nome === nome) ?? api(token, 'POST', '/alunos', { nome, turmaId, responsavelNome: resp, responsavelContato: contato });
}
const ana = await aluno('Ana Souza', turma.id, 'Marcia Souza', '(11) 99999-0001');
const bruno = await aluno('Bruno Lima', turma.id, 'Carlos Lima', '(11) 99999-0002');
const carla = await aluno('Carla Mendes', turmaB.id, 'Paula Mendes', '(11) 99999-0003');
const forn = (await api(token, 'GET', '/fornecedores')).find(f => f.nome === 'Distribuidora Bom Lanche') ?? await api(token, 'POST', '/fornecedores', { nome: 'Distribuidora Bom Lanche', contato: '(11) 3333-4444' });
if ((await api(token, 'GET', '/compras?inicio=2000-01-01&fim=2100-01-01')).length === 0) {
  await api(token, 'POST', '/compras', { fornecedorId: forn.id, data: new Date().toISOString().slice(0, 10), observacao: 'NF 1234', itens: [{ produtoId: coxinha.id, quantidade: 20, custoUnitario: 2.1 }, { produtoId: suco.id, quantidade: 12, custoUnitario: 1.8 }] });
}
const usuarios = await api(token, 'GET', '/usuarios');
if (!usuarios.find(u => u.login === 'operador')) await api(token, 'POST', '/usuarios', { nome: 'Joana (balcão)', login: 'operador', senha: 'operador123', perfil: 'OPERADOR' });
log('seed ok. carteirinha Ana =', ana.codigoBarras);

// ---------- UI ----------
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: 'pt-BR' });
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', e => erros.push(String(e)));
page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
const shot = n => page.screenshot({ path: `${SHOTS}${n}.png`, fullPage: false });

// login
await page.goto(APP + '/dashboard');
await page.waitForURL(/\/login/);
await shot('01-login');
await page.fill('#login', 'admin');
await page.fill('#senha', 'errada');
await page.click('button[type=submit]');
await page.getByText('Login ou senha inválidos').waitFor({ timeout: 5000 });
check(true, 'login com senha errada mostra erro da API');
await page.fill('#senha', 'admin123');
await page.click('button[type=submit]');
await page.waitForURL(/\/dashboard/);
await page.getByRole('heading', { name: 'Painel do dia' }).waitFor();
await page.waitForSelector('.stat .value');
await shot('02-dashboard');
check(true, 'login admin -> dashboard');

// PDV: scan aluno, scan produto, click produto, fiado
await page.click('a[href="/pdv"]');
await page.waitForURL(/\/pdv/);
await page.waitForSelector('.produto');
const scanner = page.locator('app-scanner-input input');
await scanner.fill(ana.codigoBarras); await scanner.press('Enter');
await page.getByText('Ana Souza').first().waitFor();
check(true, 'PDV identifica aluno pela carteirinha');
await scanner.fill(coxinha.codigoBarras); await scanner.press('Enter');
await page.locator('.ficha-item', { hasText: 'Coxinha' }).waitFor();
check(true, 'PDV adiciona produto pelo código de barras');
await page.locator('.produto', { hasText: 'Suco de laranja' }).click();
await page.locator('.ficha-item', { hasText: 'Suco' }).waitFor();
await page.locator('.ficha-item', { hasText: 'Coxinha' }).getByRole('button', { name: '+', exact: true }).click();
await page.locator('.ficha-item', { hasText: 'Coxinha' }).locator('.qtd .num', { hasText: '2' }).waitFor();
const total = await page.locator('.total').innerText();
check(total.replace(/\s/g, '').includes('15,00'), `total do carrinho = ${total} (esperado R$ 15,00)`);
await shot('03-pdv');
await page.getByRole('button', { name: /Fiado/ }).click();
await page.locator('.alert-info').waitFor();
await shot('04-pdv-confirmado');
check(true, 'venda fiado confirmada');
const anaDepois = await api(token, 'GET', `/alunos/${ana.id}`);
check(Math.abs(Number(anaDepois.saldo) - (Number(ana.saldo) - 15)) < 0.001, `saldo da Ana após fiado = ${anaDepois.saldo} (esperado ${Number(ana.saldo) - 15})`);

// segunda venda paga na hora (Bruno) via UI
await scanner.fill(bruno.codigoBarras); await scanner.press('Enter');
await page.getByText('Bruno Lima').first().waitFor();
await page.locator('.produto', { hasText: 'Brigadeiro' }).click();
await page.getByRole('button', { name: /Pago na hora/ }).click();
await page.locator('.alert-info').waitFor();
const brunoDepois = await api(token, 'GET', `/alunos/${bruno.id}`);
check(Number(brunoDepois.saldo) === Number(bruno.saldo), `saldo do Bruno após pago na hora = ${brunoDepois.saldo} (inalterado)`);

// código inexistente
await scanner.fill('000000000000'); await scanner.press('Enter');
await page.getByText(/não encontrado/).waitFor();
check(true, 'código inexistente mostra erro');

// Retirada
await page.click('a[href="/retirada"]');
await page.waitForURL(/\/retirada/);
const sc2 = page.locator('app-scanner-input input');
await sc2.fill(ana.codigoBarras); await sc2.press('Enter');
await page.locator('.ficha').first().waitFor();
await shot('05-retirada');
const nFichas = await page.locator('.ficha').count();
check(nFichas >= 1, `retirada lista ${nFichas} ficha(s) da Ana`);
await page.locator('.ficha').first().locator('.ficha-item button', { hasText: 'Entregar' }).first().click();
await page.locator('.ficha').first().getByText('Parcial').waitFor();
check(true, 'entrega por item -> status Parcial');
await page.locator('.ficha').first().getByRole('button', { name: 'Entregar ficha inteira' }).click();
await page.getByText(/entregue/).first().waitFor();
await page.waitForTimeout(500);
const btnTodas = page.getByRole('button', { name: 'Entregar todas' });
if (await btnTodas.isVisible().catch(() => false)) await btnTodas.click({ timeout: 3000 }).catch(() => {});
await page.getByText('Nada pendente').waitFor();
check(true, 'entrega da ficha inteira / todas -> nada pendente');
await shot('06-retirada-vazia');

// Conta do aluno: extrato + crédito
await page.click('a[href="/conta"]');
await page.waitForURL(/\/conta$/);
await page.locator('input[placeholder="Ou busque pelo nome"]').fill('Ana');
await page.locator('.sugestoes button').first().click();
await page.waitForURL(/\/conta\/\d+/);
await page.getByText('Compra fiado').first().waitFor();
await page.locator('input[type=number]').fill('50');
await page.locator('input[placeholder*="pago pela"]').fill('Crédito da mãe');
await page.getByRole('button', { name: 'Registrar' }).click();
await page.getByText(/Lançamento registrado/).waitFor();
const esperado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(anaDepois.saldo) + 50);
await page.locator('.stat .value').first().getByText(esperado.replace(/\u00a0/g, ' ').trim().slice(3)).waitFor();
check(true, `crédito de R$ 50 deixa saldo em ${esperado}`);
await shot('07-conta-aluno');

// Relatórios: reconciliação
await page.goto(APP + '/relatorios/reconciliacao');
await page.locator('table.table tbody tr').first().waitFor();
const rec = await page.locator('.stat .value').first().innerText();
const recApi = await api(token, 'GET', '/relatorios/reconciliacao');
const recEsperado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recApi.caixaEsperado).replace(/\u00a0/g, ' ');
check(rec.replace(/\u00a0/g, ' ') === recEsperado, `caixa esperado na tela = ${rec} (API: ${recEsperado})`);
await shot('08-reconciliacao');

// Estoque: sobras
await page.goto(APP + '/sobras/nova');
await page.locator('table.table tbody tr').first().waitFor();
await page.locator('tr', { hasText: 'Água mineral' }).locator('input[type=number]').fill('7');
await page.getByRole('button', { name: 'Salvar contagem' }).click();
await page.waitForURL(/\/sobras$/);
await page.getByText(/1 divergência|divergência/).first().waitFor({ timeout: 5000 }).catch(() => {});
await page.locator('table.table tbody tr').first().waitFor();
check(true, 'contagem de sobras registrada');
await shot('09-sobras');

// Operador: sem acesso ao dashboard, mas com PDV
await page.getByRole('button', { name: 'Sair' }).click();
await page.waitForURL(/\/login/);
await page.fill('#login', 'operador'); await page.fill('#senha', 'operador123');
await page.click('button[type=submit]');
await page.waitForURL(/\/pdv/);
check(await page.locator('a[href="/dashboard"]').count() === 0, 'operador não vê o painel no menu');
await page.goto(APP + '/dashboard');
await page.waitForURL(/\/pdv/);
check(true, 'operador redirecionado do /dashboard para /pdv');
await page.goto(APP + '/produtos');
await page.locator('table.table tbody tr').first().waitFor();
await shot('10-produtos-operador');

// mobile
await page.setViewportSize({ width: 390, height: 800 });
await page.goto(APP + '/pdv');
await page.waitForSelector('.produto');
await shot('11-mobile-pdv');

await browser.close();
const errosRelevantes = erros.filter(e => !e.includes('favicon') && !e.startsWith('Failed to load resource'));
check(errosRelevantes.length === 0, `sem erros de console/página (${errosRelevantes.length})`);
if (errosRelevantes.length) console.log(errosRelevantes.slice(0, 10).join('\n'));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OS PASSOS OK');
process.exit(falhas.length ? 1 : 0);

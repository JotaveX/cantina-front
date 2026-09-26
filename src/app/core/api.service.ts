import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { SILENCIAR_ERRO } from './http-context';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Aluno, AlunoTrocaAno, Baixa, BilhetesCobranca, Carteirinha, Categoria, Compra, ConferenciaFichas, Configuracao, ConsumoAluno, Dashboard, EmAtraso, Extrato, FechamentoMensal, FichaProduto, Fornecedor,
  Lancamento, MotivoBaixa, Page, Produto, Reconciliacao, RelatorioEstoque, ResumoConferencia, Sobras, StatusVenda, FormaPagamento, Tendencias, TipoLancamento,
  TrocaAnoRequest, TrocaAnoResultado, Turma, Usuario, Venda, VendaRequest, VendasPeriodo,
} from './models';

/** Monta HttpParams ignorando valores vazios. */
export function params(obj: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

export const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CadastrosApi {
  private http = inject(HttpClient);

  // Turmas
  turmas() { return this.http.get<Turma[]>(`${API}/turmas`); }
  salvarTurma(t: Partial<Turma>) { return t.id ? this.http.put<Turma>(`${API}/turmas/${t.id}`, t) : this.http.post<Turma>(`${API}/turmas`, t); }
  desativarTurma(id: number) { return this.http.delete<void>(`${API}/turmas/${id}`); }

  // Troca de ano
  alunosTrocaAno() { return this.http.get<AlunoTrocaAno[]>(`${API}/troca-de-ano/alunos`); }
  aplicarTrocaAno(req: TrocaAnoRequest) { return this.http.post<TrocaAnoResultado>(`${API}/troca-de-ano`, req); }

  // Alunos
  alunos(f: { nome?: string; turmaId?: number | null; apenasAtivos?: boolean; page?: number; size?: number }) {
    return this.http.get<Page<Aluno>>(`${API}/alunos`, { params: params(f) });
  }
  aluno(id: number) { return this.http.get<Aluno>(`${API}/alunos/${id}`); }
  alunoPorCodigo(codigo: string, silencioso = false) {
    return this.http.get<Aluno>(`${API}/alunos/codigo/${encodeURIComponent(codigo)}`, { context: new HttpContext().set(SILENCIAR_ERRO, silencioso) });
  }
  salvarAluno(a: Partial<Aluno>) { return a.id ? this.http.put<Aluno>(`${API}/alunos/${a.id}`, a) : this.http.post<Aluno>(`${API}/alunos`, a); }
  reemitirCodigo(id: number) { return this.http.post<Aluno>(`${API}/alunos/${id}/reemitir-codigo`, {}); }
  desativarAluno(id: number) { return this.http.delete<void>(`${API}/alunos/${id}`); }

  // Categorias e produtos
  categorias() { return this.http.get<Categoria[]>(`${API}/categorias`); }
  salvarCategoria(c: Partial<Categoria>) { return c.id ? this.http.put<Categoria>(`${API}/categorias/${c.id}`, c) : this.http.post<Categoria>(`${API}/categorias`, c); }
  excluirCategoria(id: number) { return this.http.delete<void>(`${API}/categorias/${id}`); }
  produtos(f: { nome?: string; categoriaId?: number | null; apenasAtivos?: boolean }) { return this.http.get<Produto[]>(`${API}/produtos`, { params: params(f) }); }
  produto(id: number) { return this.http.get<Produto>(`${API}/produtos/${id}`); }
  produtoPorCodigo(codigo: string, silencioso = false) {
    return this.http.get<Produto>(`${API}/produtos/codigo/${encodeURIComponent(codigo)}`, { context: new HttpContext().set(SILENCIAR_ERRO, silencioso) });
  }
  salvarProduto(p: Partial<Produto>) { return p.id ? this.http.put<Produto>(`${API}/produtos/${p.id}`, p) : this.http.post<Produto>(`${API}/produtos`, p); }
  desativarProduto(id: number) { return this.http.delete<void>(`${API}/produtos/${id}`); }

  // Fornecedores
  fornecedores() { return this.http.get<Fornecedor[]>(`${API}/fornecedores`); }
  salvarFornecedor(f: Partial<Fornecedor>) { return f.id ? this.http.put<Fornecedor>(`${API}/fornecedores/${f.id}`, f) : this.http.post<Fornecedor>(`${API}/fornecedores`, f); }
  desativarFornecedor(id: number) { return this.http.delete<void>(`${API}/fornecedores/${id}`); }

  // Usuários
  usuarios() { return this.http.get<Usuario[]>(`${API}/usuarios`); }
  salvarUsuario(u: Partial<Usuario> & { senha?: string }) { return u.id ? this.http.put<Usuario>(`${API}/usuarios/${u.id}`, u) : this.http.post<Usuario>(`${API}/usuarios`, u); }
  desativarUsuario(id: number) { return this.http.delete<void>(`${API}/usuarios/${id}`); }
  trocarSenha(senhaAtual: string, novaSenha: string) { return this.http.post<void>(`${API}/auth/trocar-senha`, { senhaAtual, novaSenha }); }

  // Configurações (dia de fechamento, texto do bilhete)
  configuracao() { return this.http.get<Configuracao>(`${API}/configuracoes`); }
  salvarConfiguracao(c: { diaFechamento: number; instrucoesPagamento?: string }) { return this.http.put<Configuracao>(`${API}/configuracoes`, c); }
}

@Injectable({ providedIn: 'root' })
export class OperacoesApi {
  private http = inject(HttpClient);

  // Vendas / PDV
  criarVenda(req: VendaRequest) { return this.http.post<Venda>(`${API}/vendas`, req); }
  vendas(f: { inicio: string; fim: string; alunoId?: number | null; status?: StatusVenda | ''; formaPagamento?: FormaPagamento | ''; page?: number; size?: number }) {
    return this.http.get<Page<Venda>>(`${API}/vendas`, { params: params(f) });
  }
  venda(id: number) { return this.http.get<Venda>(`${API}/vendas/${id}`); }
  cancelarVenda(id: number, motivo: string) { return this.http.post<Venda>(`${API}/vendas/${id}/cancelar`, { motivo }); }

  // Conferência de fichas (secretaria)
  resumoConferencia(data: string) { return this.http.get<ResumoConferencia>(`${API}/conferencias-fichas/resumo`, { params: params({ data }) }); }
  registrarConferencia(req: { data: string; dinheiroContado?: number | null; observacao?: string; itens: { produtoId: number; quantidadeRecolhida: number }[] }) {
    return this.http.post<ConferenciaFichas>(`${API}/conferencias-fichas`, req);
  }

  // Estoque
  compras(inicio: string, fim: string) { return this.http.get<Compra[]>(`${API}/compras`, { params: params({ inicio, fim }) }); }
  compra(id: number) { return this.http.get<Compra>(`${API}/compras/${id}`); }
  criarCompra(req: { fornecedorId: number; data: string; observacao?: string; itens: { produtoId: number; quantidade: number; custoUnitario: number }[] }) {
    return this.http.post<Compra>(`${API}/compras`, req);
  }
  baixas(inicio: string, fim: string) { return this.http.get<Baixa[]>(`${API}/baixas-estoque`, { params: params({ inicio, fim }) }); }
  criarBaixa(req: { produtoId: number; quantidade: number; motivo: MotivoBaixa; observacao?: string }) { return this.http.post<Baixa>(`${API}/baixas-estoque`, req); }
  sobras(inicio: string, fim: string) { return this.http.get<Sobras[]>(`${API}/sobras`, { params: params({ inicio, fim }) }); }
  sobra(id: number) { return this.http.get<Sobras>(`${API}/sobras/${id}`); }
  criarSobras(req: { observacao?: string; ajustarEstoque: boolean; itens: { produtoId: number; quantidadeContada: number }[] }) {
    return this.http.post<Sobras>(`${API}/sobras`, req);
  }

  // Financeiro
  lancar(req: { alunoId: number; tipo: TipoLancamento; valor: number; descricao?: string }, negativo = false) {
    return this.http.post<Lancamento>(`${API}/lancamentos`, req, { params: params({ negativo }) });
  }
  lancamentos(inicio: string, fim: string, alunoId?: number | null) { return this.http.get<Lancamento[]>(`${API}/lancamentos`, { params: params({ inicio, fim, alunoId }) }); }
}

@Injectable({ providedIn: 'root' })
export class RelatoriosApi {
  private http = inject(HttpClient);

  dashboard() { return this.http.get<Dashboard>(`${API}/dashboard`); }
  tendencias() { return this.http.get<Tendencias>(`${API}/dashboard/tendencias`); }
  carteirinhas(turmaId?: number | null, apenasAtivos = true) { return this.http.get<Carteirinha[]>(`${API}/relatorios/carteirinhas`, { params: params({ turmaId, apenasAtivos }) }); }
  emAtraso() { return this.http.get<EmAtraso>(`${API}/relatorios/em-atraso`); }
  fechamentoMensal(ano: number, mes: number, apenasEmAberto = true) { return this.http.get<FechamentoMensal>(`${API}/relatorios/fechamento-mensal`, { params: params({ ano, mes, apenasEmAberto }) }); }
  bilhetesCobranca(ano: number, mes: number, escopo: { turmaId?: number | null; alunoId?: number | null }) {
    return this.http.get<BilhetesCobranca>(`${API}/relatorios/bilhetes-cobranca`, { params: params({ ano, mes, ...escopo }) });
  }
  consumoAluno(alunoId: number, ano: number, mes: number) { return this.http.get<ConsumoAluno>(`${API}/relatorios/consumo-aluno/${alunoId}`, { params: params({ ano, mes }) }); }
  estoque(apenasBaixo = false, categoriaId?: number | null) { return this.http.get<RelatorioEstoque>(`${API}/relatorios/estoque`, { params: params({ apenasBaixo, categoriaId }) }); }
  vendasPeriodo(inicio: string, fim: string) { return this.http.get<VendasPeriodo>(`${API}/relatorios/vendas-periodo`, { params: params({ inicio, fim }) }); }
  fichasProdutos(inicio: string, fim: string) { return this.http.get<FichaProduto[]>(`${API}/relatorios/fichas-produtos`, { params: params({ inicio, fim }) }); }
  extrato(alunoId: number, inicio?: string, fim?: string) { return this.http.get<Extrato>(`${API}/relatorios/extrato/${alunoId}`, { params: params({ inicio, fim }) }); }
  reconciliacao(data?: string) { return this.http.get<Reconciliacao>(`${API}/relatorios/reconciliacao`, { params: params({ data }) }); }
}

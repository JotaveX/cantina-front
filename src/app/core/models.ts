// Tipos espelhando os DTOs da API (backend/src/main/java/br/com/cantina/**/*Dtos.java)

export type Perfil = 'ADMIN' | 'OPERADOR';
export type FormaPagamento = 'FIADO' | 'PAGO_NA_HORA';
export type StatusVenda = 'PENDENTE' | 'RETIRADO_PARCIAL' | 'RETIRADO' | 'CANCELADO';
export type TipoLancamento = 'CREDITO' | 'PAGAMENTO' | 'DEBITO_FIADO' | 'ESTORNO' | 'AJUSTE';
export type MotivoBaixa = 'PERDA' | 'QUEBRA' | 'VENCIMENTO' | 'OUTRO';

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details?: { campo: string; mensagem: string }[];
}

export interface Usuario { id: number; nome: string; login: string; perfil: Perfil; ativo: boolean; criadoEm: string; }
export interface LoginResponse { token: string; expiraEm: string; usuario: Usuario; }

export interface Turma { id: number; nome: string; serie?: string; ativo: boolean; }
export interface Aluno {
  id: number; nome: string; turmaId?: number; turmaNome?: string; codigoBarras: string; saldo: number;
  responsavelNome?: string; responsavelContato?: string; ativo: boolean; permiteSaldoNegativo: boolean; criadoEm: string;
}
export interface Categoria { id: number; nome: string; }
export interface Produto {
  id: number; nome: string; categoriaId?: number; categoriaNome?: string; codigoBarras?: string; preco: number;
  quantidadeEstoque: number; estoqueMinimo: number; estoqueBaixo: boolean; ativo: boolean; validade: string;
}
export interface Fornecedor { id: number; nome: string; contato?: string; ativo: boolean; }

export interface ItemVenda {
  id: number; produtoId: number; nomeProduto: string; quantidade: number; precoUnitario: number; subtotal: number; retirado: boolean;
}
export interface Venda {
  id: number; alunoId: number; alunoNome: string; alunoTurma?: string; saldoAluno: number; formaPagamento: FormaPagamento;
  status: StatusVenda; valorTotal: number; dataHora: string; operadorNome?: string; canceladoEm?: string;
  motivoCancelamento?: string; itens?: ItemVenda[];
}
export interface VendaRequest {
  alunoId?: number; codigoBarrasAluno?: string; formaPagamento: FormaPagamento; itens: { produtoId: number; quantidade: number }[];
}
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; }

export interface Lancamento {
  id: number; alunoId: number; alunoNome: string; tipo: TipoLancamento; valor: number; saldoApos: number; vendaId?: number;
  descricao?: string; usuarioNome?: string; dataHora: string;
}

export interface ItemCompra { id: number; produtoId: number; produtoNome: string; quantidade: number; custoUnitario: number; subtotal: number; }
export interface Compra {
  id: number; fornecedorId: number; fornecedorNome: string; data: string; observacao?: string; valorTotal: number;
  usuarioNome?: string; criadoEm: string; itens?: ItemCompra[];
}
export interface Baixa {
  id: number; produtoId: number; produtoNome: string; quantidade: number; motivo: MotivoBaixa; observacao?: string;
  usuarioNome?: string; dataHora: string;
}
export interface ItemSobras { id: number; produtoId: number; produtoNome: string; quantidadeSistema: number; quantidadeContada: number; diferenca: number; }
export interface Sobras { id: number; dataHora: string; observacao?: string; usuarioNome?: string; totalDivergencias: number; itens?: ItemSobras[]; }

export interface Carteirinha { alunoId: number; nome: string; turma?: string; codigoBarras: string; ativo: boolean; }
export interface EmAtraso {
  quantidadeAlunos: number; totalEmAberto: number;
  alunos: { alunoId: number; nome: string; turma?: string; saldo: number; responsavelNome?: string; responsavelContato?: string }[];
}
export interface FechamentoMensal {
  ano: number; mes: number; quantidadeAlunosEmAberto: number; totalEmAberto: number; totalFiadoNoMes: number;
  alunos: { alunoId: number; nome: string; turma?: string; responsavelNome?: string; responsavelContato?: string;
    comprasFiadoNoMes: number; creditosNoMes: number; pagamentosNoMes: number; saldoAtual: number }[];
}
export interface RelatorioEstoque {
  totalProdutos: number; produtosComEstoqueBaixo: number; valorTotalEstoque: number;
  produtos: { produtoId: number; nome: string; categoria?: string; quantidadeEstoque: number; estoqueMinimo: number;
    estoqueBaixo: boolean; preco: number; valorEmEstoque: number }[];
}
export interface VendasPeriodo {
  inicio: string; fim: string; quantidadeVendas: number; quantidadeItens: number; totalFiado: number; totalPago: number; totalGeral: number;
  porDia: { data: string; quantidadeVendas: number; totalFiado: number; totalPago: number; total: number }[];
  porProduto: { produtoId: number; nome: string; quantidade: number; total: number }[];
}
export interface FichaProduto { produtoId: number; nome: string; fichasEmitidas: number; fichasRetiradas: number; fichasPendentes: number; valorTotal: number; }
export interface Extrato {
  alunoId: number; nome: string; turma?: string; codigoBarras: string; saldoAtual: number; inicio?: string; fim?: string;
  totalCreditos: number; totalDebitos: number; lancamentos: Lancamento[];
}
export interface Reconciliacao {
  data: string; pedidosFeitos: number; pedidosRetirados: number; pedidosParciais: number; pedidosPendentes: number; pedidosCancelados: number;
  itensVendidos: number; itensRetirados: number; itensPendentes: number; totalVendas: number; totalPagoNaHora: number; totalFiado: number;
  caixaEsperado: number; contagemSobrasId?: number; contagemSobrasEm?: string;
  produtos: { produtoId: number; nome: string; vendidos: number; retirados: number; pendentes: number; baixasManuais: number;
    estoqueAtual: number; contagemFisica?: number; diferencaContagem?: number }[];
}
export interface Dashboard {
  data: string;
  hoje: { quantidadeVendas: number; totalGeral: number; totalFiado: number; totalPago: number };
  mes: { quantidadeVendas: number; totalGeral: number; totalFiado: number; totalPago: number };
  pedidosPendentesRetirada: number; alunosEmAtraso: number; totalEmAberto: number; produtosEstoqueBaixo: number; estoqueBaixo: Produto[];
}

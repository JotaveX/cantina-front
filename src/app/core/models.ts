// Tipos espelhando os DTOs da API (backend/src/main/java/br/com/cantina/**/*Dtos.java)

export type Perfil = 'ADMIN' | 'OPERADOR';
export type FormaPagamento = 'FIADO' | 'PAGO_NA_HORA';
export type StatusVenda = 'CONCLUIDA' | 'CANCELADA';
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

export interface Turma {
  id: number; nome: string; serie?: string; ativo: boolean;
  /** Destino na troca de ano: a próxima turma, ou turma final (formandos saem). Sem nenhum dos dois = não definido (turmas antigas). */
  proximaTurmaId?: number; proximaTurmaNome?: string; turmaFinal: boolean;
}

export type AcaoTrocaAno = 'AVANCAR' | 'REPETIR' | 'SAIR';
export interface AlunoTrocaAno { id: number; nome: string; turmaId?: number; saldo: number; }
export interface TrocaAnoRequest {
  alunos: { alunoId: number; acao: AcaoTrocaAno; turmaDestinoId?: number | null }[];
}
export interface TrocaAnoResultado { avancaram: number; repetiram: number; sairam: number; }
export interface Aluno {
  id: number; nome: string; turmaId?: number; turmaNome?: string; codigoBarras: string; saldo: number;
  responsavelNome?: string; responsavelContato?: string; ativo: boolean; permiteSaldoNegativo: boolean; criadoEm: string;
}
export interface Categoria { id: number; nome: string; }
export interface Produto {
  id: number; nome: string; categoriaId?: number; categoriaNome?: string; codigoBarras?: string; preco: number;
  quantidadeEstoque: number; estoqueMinimo: number; estoqueBaixo: boolean; ativo: boolean; validade: string;
  /** Custo unitário atual (preenchido pela compra mais recente, editável); ausente = desconhecido. */
  custo?: number;
}
export interface Fornecedor { id: number; nome: string; contato?: string; ativo: boolean; }

export interface ItemVenda {
  id: number; produtoId: number; nomeProduto: string; quantidade: number; precoUnitario: number; subtotal: number;
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
  ano: number; mes: number; inicio: string; fim: string; quantidadeAlunosEmAberto: number; totalEmAberto: number; totalFiadoNoMes: number;
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
export interface FichaProduto { produtoId: number; nome: string; fichasEmitidas: number; valorTotal: number; }
export interface Extrato {
  alunoId: number; nome: string; turma?: string; codigoBarras: string; saldoAtual: number; inicio?: string; fim?: string;
  totalCreditos: number; totalDebitos: number; lancamentos: Lancamento[];
}
export interface Reconciliacao {
  data: string; pedidosFeitos: number; pedidosCancelados: number;
  itensVendidos: number; totalVendas: number; totalPagoNaHora: number; totalFiado: number;
  caixaEsperado: number; contagemSobrasId?: number; contagemSobrasEm?: string;
  produtos: { produtoId: number; nome: string; vendidos: number; baixasManuais: number;
    estoqueAtual: number; contagemFisica?: number; diferencaContagem?: number }[];
}
export interface ItemConferencia { produtoId: number; nomeProduto: string; quantidadeVendida: number; quantidadeRecolhida: number; diferenca: number; }
export interface ConferenciaFichas {
  id: number; data: string; dataHora: string; usuarioNome?: string; observacao?: string;
  totalFichasVendidas: number; totalFichasRecolhidas: number; diferencaFichas: number; produtosDivergentes: number;
  dinheiroEsperado: number; dinheiroContado?: number; diferencaDinheiro?: number; confere: boolean; itens: ItemConferencia[];
}
export interface ResumoConferencia {
  data: string; quantidadeVendas: number; quantidadeCanceladas: number; quantidadeVendasDinheiro: number; quantidadeVendasFiado: number;
  totalFichas: number; totalVendido: number; totalFiado: number; dinheiroEsperado: number;
  produtos: { produtoId: number; nome: string; quantidadeVendida: number; valorTotal: number }[];
  conferencias: ConferenciaFichas[];
}
/** diasParaVencer: negativo = vencido há N dias. */
export interface ProdutoAlerta { id: number; nome: string; quantidadeEstoque: number; estoqueMinimo: number; validade?: string; diasParaVencer?: number; }
export interface DivergenciaCaixa {
  conferenciaId: number; data: string; dinheiroEsperado: number; dinheiroContado?: number; diferencaDinheiro?: number;
  fichasVendidas: number; fichasRecolhidas: number; diferencaFichas: number;
}
/** Painel em tempo real (hoje + alertas); também chega pelo WebSocket. */
export interface Dashboard {
  data: string;
  hoje: { quantidadeVendas: number; totalGeral: number; totalFiado: number; totalPago: number; ticketMedio?: number;
    mediaDiaSemana?: number; diasNaMedia: number; semanasNaMedia: number };
  estoqueZerado: ProdutoAlerta[]; estoqueBaixo: ProdutoAlerta[];
  vencidos: ProdutoAlerta[]; vencendo: ProdutoAlerta[]; diasAlertaValidade: number;
  divergenciasCaixa: DivergenciaCaixa[]; diasDivergenciaCaixa: number;
  alunosEmAtraso: number; totalEmAberto: number;
}
export interface ResumoVendas { quantidadeVendas: number; faturamento: number; ticketMedio?: number; }
export interface ProdutoRanking { produtoId: number; nome: string; quantidade: number; receita: number; lucro?: number; }
export interface PontoFaturamento { inicio: string; fim: string; quantidadeVendas: number; faturamento: number; parcial: boolean; }
/** Histórico do ciclo de fechamento, carregado sob demanda. */
export interface Tendencias {
  data: string;
  comparativo: { cicloAtual: PeriodoFechamento; atual: ResumoVendas; cicloAnterior: PeriodoFechamento;
    anteriorMesmoPontoAte: string; anteriorMesmoPonto: ResumoVendas; anteriorCompleto: ResumoVendas };
  margem: { receitaComCusto: number; custo: number; lucro: number; margemPercentual?: number; receitaSemCusto: number;
    produtosAtivosSemCusto: number };
  formasPagamento: { forma: FormaPagamento; quantidade: number; total: number }[];
  consumoTurmas: { turmaId?: number; turma?: string; serie?: string; quantidadeVendas: number; alunosCompradores: number; total: number }[];
  maisVendidos: ProdutoRanking[]; menosVendidos: ProdutoRanking[];
  faturamentoSemanal: PontoFaturamento[]; faturamentoMensal: PontoFaturamento[];
  perdas: { motivo: MotivoBaixa; quantidade: number; valorCusto: number; quantidadeSemCusto: number }[];
}

/** Período coberto pelo fechamento de um mês de referência (datas inclusivas, YYYY-MM-DD). */
export interface PeriodoFechamento { ano: number; mes: number; inicio: string; fim: string; }
export interface Configuracao { diaFechamento: number; instrucoesPagamento?: string; cicloAtual: PeriodoFechamento; }
export interface BilheteCobranca { alunoId: number; nome: string; turma?: string; responsavelNome?: string; valorDevido: number; }
export interface BilhetesCobranca {
  ano: number; mes: number; inicio: string; fim: string; instrucoesPagamento?: string;
  quantidade: number; totalDevido: number; bilhetes: BilheteCobranca[];
}
export interface ConsumoAluno {
  alunoId: number; nome: string; turma?: string; responsavelNome?: string; ano: number; mes: number; inicio: string; fim: string;
  quantidadeCompras: number; quantidadeItens: number; totalGasto: number; totalFiado: number; totalPagoNaHora: number;
  saldoAnterior: number; creditosEPagamentos: number; saldoFinal: number;
  porProduto: { nomeProduto: string; quantidade: number; total: number }[];
  compras: { vendaId: number; dataHora: string; formaPagamento: FormaPagamento; valorTotal: number;
    itens: { nomeProduto: string; quantidade: number; precoUnitario: number; subtotal: number }[] }[];
}

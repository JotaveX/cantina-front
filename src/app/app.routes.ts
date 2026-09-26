import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pdv' },
      { path: 'pdv', loadComponent: () => import('./features/pdv/pdv.component').then(m => m.PdvComponent) },
      { path: 'conferencia', loadComponent: () => import('./features/conferencia/conferencia.component').then(m => m.ConferenciaComponent) },
      { path: 'retirada', pathMatch: 'full', redirectTo: 'conferencia' },
      { path: 'dashboard', canActivate: [adminGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },

      { path: 'alunos', loadComponent: () => import('./features/cadastros/alunos.component').then(m => m.AlunosComponent) },
      { path: 'alunos/novo', loadComponent: () => import('./features/cadastros/aluno-form.component').then(m => m.AlunoFormComponent) },
      { path: 'alunos/:id', loadComponent: () => import('./features/cadastros/aluno-form.component').then(m => m.AlunoFormComponent) },
      { path: 'turmas', loadComponent: () => import('./features/cadastros/turmas.component').then(m => m.TurmasComponent) },
      { path: 'troca-de-ano', loadComponent: () => import('./features/cadastros/troca-ano.component').then(m => m.TrocaAnoComponent) },
      { path: 'produtos', loadComponent: () => import('./features/cadastros/produtos.component').then(m => m.ProdutosComponent) },
      { path: 'produtos/novo', loadComponent: () => import('./features/cadastros/produto-form.component').then(m => m.ProdutoFormComponent) },
      { path: 'produtos/:id', loadComponent: () => import('./features/cadastros/produto-form.component').then(m => m.ProdutoFormComponent) },
      { path: 'fornecedores', loadComponent: () => import('./features/cadastros/fornecedores.component').then(m => m.FornecedoresComponent) },
      { path: 'configuracoes', canActivate: [adminGuard], loadComponent: () => import('./features/cadastros/configuracoes.component').then(m => m.ConfiguracoesComponent) },
      { path: 'usuarios', canActivate: [adminGuard], loadComponent: () => import('./features/cadastros/usuarios.component').then(m => m.UsuariosComponent) },

      { path: 'compras', canActivate: [adminGuard], loadComponent: () => import('./features/estoque/compras.component').then(m => m.ComprasComponent) },
      { path: 'compras/nova', canActivate: [adminGuard], loadComponent: () => import('./features/estoque/compra-form.component').then(m => m.CompraFormComponent) },
      { path: 'baixas', loadComponent: () => import('./features/estoque/baixas.component').then(m => m.BaixasComponent) },
      { path: 'sobras', loadComponent: () => import('./features/estoque/sobras.component').then(m => m.SobrasComponent) },
      { path: 'sobras/nova', loadComponent: () => import('./features/estoque/sobras-form.component').then(m => m.SobrasFormComponent) },

      { path: 'conta', canActivate: [adminGuard], loadComponent: () => import('./features/financeiro/conta-aluno.component').then(m => m.ContaAlunoComponent) },
      { path: 'conta/:alunoId', canActivate: [adminGuard], loadComponent: () => import('./features/financeiro/conta-aluno.component').then(m => m.ContaAlunoComponent) },
      { path: 'vendas', canActivate: [adminGuard], loadComponent: () => import('./features/financeiro/vendas.component').then(m => m.VendasComponent) },

      { path: 'documentos', loadComponent: () => import('./features/documentos/documentos.component').then(m => m.DocumentosComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'carteirinhas' },
          { path: 'consumo', canActivate: [adminGuard], loadComponent: () => import('./features/relatorios/rel-consumo.component').then(m => m.RelConsumoComponent) },
          { path: 'bilhetes', canActivate: [adminGuard], loadComponent: () => import('./features/relatorios/rel-bilhetes.component').then(m => m.RelBilhetesComponent) },
          { path: 'carteirinhas', loadComponent: () => import('./features/relatorios/rel-carteirinhas.component').then(m => m.RelCarteirinhasComponent) },
        ] },

      { path: 'relatorios', loadComponent: () => import('./features/relatorios/relatorios.component').then(m => m.RelatoriosComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'estoque' },
          { path: 'estoque', loadComponent: () => import('./features/relatorios/rel-estoque.component').then(m => m.RelEstoqueComponent) },
          { path: 'fichas', loadComponent: () => import('./features/relatorios/rel-fichas.component').then(m => m.RelFichasComponent) },
          { path: 'em-atraso', canActivate: [adminGuard], loadComponent: () => import('./features/relatorios/rel-em-atraso.component').then(m => m.RelEmAtrasoComponent) },
          { path: 'fechamento', canActivate: [adminGuard], loadComponent: () => import('./features/relatorios/rel-fechamento.component').then(m => m.RelFechamentoComponent) },
          { path: 'vendas-periodo', canActivate: [adminGuard], loadComponent: () => import('./features/relatorios/rel-vendas-periodo.component').then(m => m.RelVendasPeriodoComponent) },
          { path: 'reconciliacao', canActivate: [adminGuard], loadComponent: () => import('./features/relatorios/rel-reconciliacao.component').then(m => m.RelReconciliacaoComponent) },
        ] },
    ],
  },
  { path: '**', redirectTo: '' },
];

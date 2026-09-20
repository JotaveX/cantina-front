import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mensagemErro } from './erro.util';

describe('mensagemErro', () => {
  it('usa a mensagem padronizada da API e os detalhes de campo', () => {
    const err = new HttpErrorResponse({ status: 400, error: { message: 'Dados inválidos', details: [{ campo: 'nome', mensagem: 'obrigatório' }] } });
    expect(mensagemErro(err)).toBe('Dados inválidos (nome: obrigatório)');
  });

  it('explica falha de conexão', () => {
    expect(mensagemErro(new HttpErrorResponse({ status: 0 }))).toContain('servidor');
  });
});

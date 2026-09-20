import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

/** Extrai uma mensagem legível do formato de erro padronizado da API. */
export function mensagemErro(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Não foi possível falar com o servidor. Verifique a conexão ou se a API está no ar.';
    const body = err.error as Partial<ApiError> | undefined;
    if (body?.message) {
      const detalhes = body.details?.map(d => `${d.campo}: ${d.mensagem}`).join('; ');
      return detalhes ? `${body.message} (${detalhes})` : body.message;
    }
    return `Erro ${err.status}`;
  }
  return 'Erro inesperado';
}

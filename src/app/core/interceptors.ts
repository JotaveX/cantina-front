import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { mensagemErro } from './erro.util';
import { SILENCIAR_ERRO } from './http-context';
import { ToastService } from './toast.service';

/** Anexa o token JWT e derruba a sessão quando a API responde 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const autenticada = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(autenticada).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.endsWith('/auth/login')) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};

/** Mostra um toast para qualquer erro da API, exceto quando o componente pediu para silenciar. */
export const erroInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!req.context.get(SILENCIAR_ERRO) && !(err instanceof HttpErrorResponse && err.status === 401)) {
        toast.erro(mensagemErro(err));
      }
      return throwError(() => err);
    }),
  );
};

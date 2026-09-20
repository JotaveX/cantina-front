import { HttpContextToken } from '@angular/common/http';

/** Quando true, o interceptor de erros não mostra toast (o componente trata o erro). */
export const SILENCIAR_ERRO = new HttpContextToken<boolean>(() => false);

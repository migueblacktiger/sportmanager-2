import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { TOKEN_KEY } from './api.config';
import { AuthSessionState } from './auth-session-state.service';
import { NEGOCIO_API_URL } from './negocio-api.config';

// Complements the existing security interceptor without changing its policy.
export const negocioAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionState = inject(AuthSessionState);
  const isNegocioRequest = request.url === NEGOCIO_API_URL
    || request.url.startsWith(`${NEGOCIO_API_URL}/`);
  const token = isNegocioRequest ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) request = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(request).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && token
        && localStorage.getItem(TOKEN_KEY) === token) sessionState.invalidate();
    return throwError(() => error);
  }));
};

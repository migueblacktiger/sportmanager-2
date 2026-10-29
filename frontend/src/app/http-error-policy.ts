export interface ErrorResponseBody {
  message?: string;
  errors?: Record<string, string>;
}

export function shouldInvalidateSession(status: number, url: string): boolean {
  return status === 401
    && !isAuthEndpoint(url, '/auth/login')
    && !isAuthEndpoint(url, '/auth/register')
    && !isAuthEndpoint(url, '/auth/oauth/firebase')
    && !isAuthEndpoint(url, '/auth/password/forgot')
    && !isAuthEndpoint(url, '/auth/password/reset')
    && !isAuthEndpoint(url, '/auth/2fa/verify')
    && !isAuthEndpoint(url, '/auth/2fa/resend')
    && !isAuthEndpoint(url, '/auth/2fa/cancel')
    && !isAuthEndpoint(url, '/auth/logout');
}

export function userFacingHttpError(
  status: number,
  url: string,
  body: ErrorResponseBody | null | undefined
): string {
  if (status === 0) {
    return 'No se pudo conectar con el servidor. Inténtalo nuevamente más tarde.';
  }
  if (url.split('?')[0].includes('/api/auth/2fa/') && [400, 409, 429, 503].includes(status)
      && body?.message?.trim()) return body.message;
  if (status === 401) {
    if (isAuthEndpoint(url, '/auth/password/forgot') || isAuthEndpoint(url, '/auth/password/reset')) {
      return 'No se pudo completar la recuperación. Solicita un enlace nuevo.';
    }
    if (isAuthEndpoint(url, '/auth/login')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (isAuthEndpoint(url, '/auth/register')) {
      return 'No se pudo completar el registro. Inténtalo nuevamente.';
    }
    if (isAuthEndpoint(url, '/auth/oauth/firebase')) {
      return body?.message?.trim() || 'SportManager no pudo validar la identidad del proveedor OAuth.';
    }
    return 'Tu sesión expiró o ya no es válida. Inicia sesión nuevamente.';
  }
  if (status === 403) {
    return 'No tienes autorización para realizar esta operación.';
  }
  if (status === 429) {
    return 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.';
  }
  if (status >= 500) {
    return 'Ocurrió un problema en el servidor. Inténtalo nuevamente más tarde.';
  }
  if (status === 400 && body?.errors && Object.keys(body.errors).length) {
    return Object.values(body.errors).join(' · ');
  }
  if ((status === 400 || status === 409) && body?.message?.trim()) {
    return body.message;
  }
  if (status === 404) {
    return 'No se encontró la información solicitada.';
  }
  return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
}

function isAuthEndpoint(url: string, endpoint: string): boolean {
  return url.split('?')[0].endsWith(`/api${endpoint}`);
}

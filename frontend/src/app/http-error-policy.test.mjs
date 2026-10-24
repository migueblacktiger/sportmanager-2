import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shouldInvalidateSession,
  userFacingHttpError
} from './http-error-policy.ts';

const apiUrl = 'http://localhost:8181/api';

test('a protected 401 invalidates the local session', () => {
  assert.equal(shouldInvalidateSession(401, `${apiUrl}/users/me/detail`), true);
  assert.equal(shouldInvalidateSession(403, `${apiUrl}/users/me/detail`), false);
});

test('authentication endpoint 401 responses do not trigger session invalidation', () => {
  assert.equal(shouldInvalidateSession(401, `${apiUrl}/auth/login`), false);
  assert.equal(shouldInvalidateSession(401, `${apiUrl}/auth/register`), false);
  assert.equal(shouldInvalidateSession(401, `${apiUrl}/auth/logout`), false);
});

test('401 and 403 errors use clear non-technical messages', () => {
  assert.equal(
    userFacingHttpError(401, `${apiUrl}/users/me/detail`, { message: 'Internal exception' }),
    'Tu sesión expiró o ya no es válida. Inicia sesión nuevamente.'
  );
  assert.equal(
    userFacingHttpError(403, `${apiUrl}/permissions`, { message: 'Internal exception' }),
    'No tienes autorización para realizar esta operación.'
  );
});

test('invalid login credentials keep a login-specific message', () => {
  assert.equal(
    userFacingHttpError(401, `${apiUrl}/auth/login`, {}),
    'Correo o contraseña incorrectos.'
  );
});

test('server failures do not expose internal exception details', () => {
  assert.equal(
    userFacingHttpError(500, `${apiUrl}/permissions`, { message: 'SQL stack trace' }),
    'Ocurrió un problema en el servidor. Inténtalo nuevamente más tarde.'
  );
});

test('validation details remain available for actionable client errors', () => {
  assert.equal(
    userFacingHttpError(400, `${apiUrl}/auth/register`, {
      errors: { email: 'El correo no es válido', name: 'El nombre es obligatorio' }
    }),
    'El correo no es válido · El nombre es obligatorio'
  );
});

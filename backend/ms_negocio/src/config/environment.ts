const DEFAULT_CORS_ORIGINS = ['http://localhost:4200', 'http://127.0.0.1:4200'];

function integer(value: unknown, fallback: number, key: string, max: number): number {
  const text = String(value ?? fallback);
  const result = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(result) || result < 1 || result > max) {
    throw new Error(`${key} debe ser un entero entre 1 y ${max}`);
  }
  return result;
}

function corsOrigins(value: unknown): string[] {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error('CORS_ORIGINS debe ser una lista de origenes HTTP(S) separados por comas');
  }
  const configured = typeof value === 'string' && value.trim()
    ? value.split(',').map(origin => origin.trim())
    : DEFAULT_CORS_ORIGINS;
  if (configured.some(origin => !origin)) {
    throw new Error('CORS_ORIGINS contiene un origen vacio');
  }
  const origins = configured.map(origin => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS debe contener origenes HTTP(S) validos');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Cada CORS_ORIGINS debe ser un origen HTTP(S), sin ruta, credenciales, query ni fragmentos');
    }
    return url.origin;
  });
  return [...new Set(origins)];
}

export function validateEnvironment(env: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE', 'MS_SECURITY']) {
    if (typeof env[key] !== 'string' || !(env[key] as string).trim()) {
      throw new Error(`${key} es obligatoria`);
    }
  }
  const securityUrl = new URL(String(env.MS_SECURITY));
  if (!['http:', 'https:'].includes(securityUrl.protocol) || securityUrl.username || securityUrl.password
      || securityUrl.search || securityUrl.hash || securityUrl.pathname !== '/') {
    throw new Error('MS_SECURITY debe ser el origen HTTP(S), sin credenciales, ruta, query ni fragmentos');
  }
  return {
    ...env,
    PORT: integer(env.PORT, 3001, 'PORT', 65535),
    DB_HOST: env.DB_HOST ?? '127.0.0.1',
    DB_PORT: integer(env.DB_PORT, 3306, 'DB_PORT', 65535),
    SECURITY_TIMEOUT_MS: integer(env.SECURITY_TIMEOUT_MS, 5000, 'SECURITY_TIMEOUT_MS', 60000),
    MS_SECURITY: securityUrl.origin,
    CORS_ORIGINS: corsOrigins(env.CORS_ORIGINS),
  };
}

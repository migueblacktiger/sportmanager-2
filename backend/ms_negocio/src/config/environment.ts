function integer(value: unknown, fallback: number, key: string, max: number): number {
  const text = String(value ?? fallback);
  const result = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(result) || result < 1 || result > max) {
    throw new Error(`${key} debe ser un entero entre 1 y ${max}`);
  }
  return result;
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
  };
}

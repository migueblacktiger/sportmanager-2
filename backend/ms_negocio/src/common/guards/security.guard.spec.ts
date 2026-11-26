import { ExecutionContext, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';

jest.unstable_mockModule('axios', () => ({
  default: {
    post: jest.fn(),
    isAxiosError: jest.fn(),
  },
}));

const axios = await import('axios');
const { SecurityGuard } = await import('./security.guard');
const post = jest.mocked(axios.default.post);
const isAxiosError = jest.mocked(axios.default.isAxiosError);

describe('SecurityGuard', () => {
  let guard: SecurityGuard;
  let context: ExecutionContext;
  let request: { path: string; method: string; headers: { authorization?: string } };
  let publicRoute: boolean;

  beforeEach(() => {
    jest.resetAllMocks();
    publicRoute = false;
    const values: Record<string, unknown> = { MS_SECURITY: 'http://localhost:8181', SECURITY_TIMEOUT_MS: 1700 };
    guard = new SecurityGuard(
      { getOrThrow: (key: string) => values[key] } as ConfigService,
      { getAllAndOverride: () => publicRoute } as unknown as Reflector,
    );
    request = { path: '/negocio/sports/15', method: 'DELETE', headers: { authorization: 'Bearer original-token' } };
    context = {
      getType: () => 'http', getHandler: () => function handler() {}, getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  });

  it('forwards the original bearer, method, prefixed path and timeout', async () => {
    post.mockResolvedValue({ status: 200, data: { allowed: true } });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(post).toHaveBeenCalledWith(
      'http://localhost:8181/api/internal/security/permissions-validation',
      { url: '/negocio/sports/15', method: 'DELETE' },
      { headers: { Authorization: 'Bearer original-token' }, timeout: 1700, maxRedirects: 0 },
    );
  });

  it('denies an explicit false', async () => {
    post.mockResolvedValue({ status: 200, data: { allowed: false } });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([undefined, '', 'Basic token', 'Bearer ', 'Bearer token extra'])('rejects malformed bearer %s', async (header) => {
    request.headers.authorization = header;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(post).not.toHaveBeenCalled();
  });

  it('honors an explicitly public route', async () => {
    publicRoute = true;
    delete request.headers.authorization;
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it.each([null, {}, { allowed: 'true' }, { allowed: 1 }])('fails closed for invalid response %j', async (data) => {
    post.mockResolvedValue({ status: 200, data });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([401, 403, 500, undefined])('handles remote status %s without allowing', async (status) => {
    isAxiosError.mockReturnValue(true);
    post.mockRejectedValue({ response: status ? { status } : undefined, code: 'ECONNABORTED' });
    const expected = status === 401 ? UnauthorizedException : status === 403 ? ForbiddenException : ServiceUnavailableException;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(expected);
  });

  it('rejects unexpected HTTP success statuses', async () => {
    post.mockResolvedValue({ status: 201, data: { allowed: true } });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects another service prefix', async () => {
    request.path = '/security/users';
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(post).not.toHaveBeenCalled();
  });
});

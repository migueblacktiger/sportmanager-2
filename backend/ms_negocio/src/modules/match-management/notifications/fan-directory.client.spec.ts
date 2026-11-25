import axios, { AxiosHeaders, type AxiosResponse } from 'axios';
import type { ConfigService } from '@nestjs/config';
import { FanDirectoryClient } from './fan-directory.client';

const response = (data: unknown): AxiosResponse<unknown> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config: { headers: new AxiosHeaders() },
});

describe('FanDirectoryClient', () => {
  const configValues: Record<string, string | number> = {
    MS_SECURITY: 'http://localhost:8181/',
    SECURITY_TIMEOUT_MS: 5000,
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => configValues[key]),
  };
  let client: FanDirectoryClient;

  beforeEach(() => {
    jest.resetAllMocks();
    delete configValues.FAN_DIRECTORY_PATH;
    configValues.MS_SECURITY = 'http://localhost:8181/';
    configValues.SECURITY_TIMEOUT_MS = 5000;
    config.get.mockImplementation((key: string) => configValues[key]);
    config.getOrThrow.mockImplementation((key: string) => configValues[key]);
    client = new FanDirectoryClient(config as unknown as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves distinct contacts from the existing security user endpoint with the caller token', async () => {
    const request = jest.spyOn(axios, 'get')
      .mockResolvedValueOnce(response({ id: 12, name: 'Ana', email: ' ana@example.com ' }))
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });

    await expect(client.findContacts([12, 12, 14], 'Bearer abc')).resolves.toEqual([
      { id: 12, name: 'Ana', email: 'ana@example.com' },
    ]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith(
      'http://localhost:8181/api/users/12',
      expect.objectContaining({
        headers: { Authorization: 'Bearer abc' },
        timeout: 5000,
        maxRedirects: 0,
      }),
    );
    expect(client.isConfigured()).toBe(true);
  });

  it('rejects invalid directory paths instead of sending requests to an unexpected endpoint', async () => {
    configValues.FAN_DIRECTORY_PATH = 'api/users';
    const request = jest.spyOn(axios, 'get');

    expect(client.isConfigured()).toBe(false);
    await expect(client.findContacts([12])).rejects.toThrow('no esta configurado');
    expect(request).not.toHaveBeenCalled();
  });
});

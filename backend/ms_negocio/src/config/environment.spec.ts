import { validateEnvironment } from './environment';

const requiredEnvironment = {
  DB_USERNAME: 'test',
  DB_PASSWORD: 'test',
  DB_DATABASE: 'test',
  MS_SECURITY: 'http://localhost:8181',
};

describe('validateEnvironment CORS origins', () => {
  it('allows both supported local frontend origins by default', () => {
    expect(validateEnvironment(requiredEnvironment).CORS_ORIGINS).toEqual([
      'http://localhost:4200',
      'http://127.0.0.1:4200',
    ]);
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(validateEnvironment({
      ...requiredEnvironment,
      CORS_ORIGINS: 'https://ui.example.test/, http://localhost:4200,https://ui.example.test',
    }).CORS_ORIGINS).toEqual([
      'https://ui.example.test',
      'http://localhost:4200',
    ]);
  });

  it('rejects CORS entries that are not origins', () => {
    expect(() => validateEnvironment({
      ...requiredEnvironment,
      CORS_ORIGINS: 'http://localhost:4200/app',
    })).toThrow(/CORS_ORIGINS/);
  });
});

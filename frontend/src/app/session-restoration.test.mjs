import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';

const directory = await mkdtemp(new URL('./.session-test-', import.meta.url));
const output = `${directory}/app.mjs`;
await build({
  stdin: {
    contents: `export { AppComponent } from './src/app/app.component';
      export { authInterceptor } from './src/app/api.service';
      export { AuthSessionState } from './src/app/auth-session-state.service';`,
    resolveDir: process.cwd(), loader: 'ts'
  },
  bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: output,
  tsconfig: 'tsconfig.json'
});

try {
  const { AppComponent, authInterceptor, AuthSessionState } = await import(pathToFileURL(output));
  const key = 'sportmanager.token';
  const apiUrl = 'http://localhost:8181/api/auth/me';
  const storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: name => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value),
      removeItem: name => storage.delete(name) }
  });

  function componentWith(api) {
    const component = Object.create(AppComponent.prototype);
    component.api = api;
    component.page = 'home';
    component.session = null;
    component.nav = page => { component.page = page; };
    component.showToast = message => { component.toast = message; };
    return component;
  }

  test('restoration calls /auth/me and moves a valid session to the dashboard', () => {
    storage.set(key, 'synthetic-test-token');
    let requested = false;
    const component = componentWith({ me: () => ({ subscribe: observer => {
      requested = true;
      observer.next({ token: 'synthetic-test-token', expiration: '2099-01-01',
        user: { id: 1, name: 'Test', email: 'test@example.invalid' }, roles: [], permissions: [] });
    }}) });
    component.restoreSession();
    assert.equal(requested, true);
    assert.equal(component.session.user.id, 1);
    assert.equal(component.page, 'dashboard');
  });

  test('restoration does not request the API when no token exists', () => {
    storage.clear();
    const component = componentWith({ me: () => { throw new Error('must not request'); } });
    component.restoreSession();
    assert.equal(component.session, null);
  });

  test('restoration lets interceptor invalidation handle a 401', () => {
    storage.set(key, 'synthetic-invalid-token');
    const component = componentWith({ me: () => ({ subscribe: observer => observer.error({ status: 401 }) }) });
    component.restoreSession();
    assert.equal(storage.get(key), 'synthetic-invalid-token');
  });

  test('session invalidation clears an expired or revoked token and returns to login', () => {
    storage.set(key, 'synthetic-invalid-token');
    const component = componentWith({});
    component.apiUsers = []; component.apiRoles = []; component.apiPermissions = [];
    component.allUserRoles = []; component.allRolePerms = [];
    component.profileForm = {}; component.userForm = {};
    component.handleSessionExpired();
    assert.equal(storage.has(key), false);
    assert.equal(component.page, 'login');
  });

  test('interceptor adds the stored Bearer header to restoration requests', () => {
    storage.set(key, 'synthetic-test-token');
    const injector = createEnvironmentInjector([AuthSessionState]);
    try {
      runInInjectionContext(injector, () => authInterceptor(
        { url: apiUrl, clone: update => ({ ...update, url: apiUrl }) },
        request => of(request)
      ).subscribe(request => assert.equal(request.setHeaders.Authorization, 'Bearer synthetic-test-token')));
    } finally { injector.destroy(); }
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}

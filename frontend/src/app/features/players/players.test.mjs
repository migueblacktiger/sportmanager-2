import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { of, throwError } from 'rxjs';

const directory = await mkdtemp(new URL('./.players-test-', import.meta.url));
try {
  await build({
    stdin: { contents: `export { PlayersManagementComponent } from './src/app/features/players/players-management.component';
      export { PlayersApiService } from './src/app/features/players/players-api.service';
      export { negocioAuthInterceptor } from './src/app/negocio-auth.interceptor';
      export { AuthSessionState } from './src/app/auth-session-state.service';`, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: `${directory}/feature.mjs`, tsconfig: 'tsconfig.json',
  });
  const { PlayersManagementComponent, PlayersApiService, negocioAuthInterceptor, AuthSessionState } = await import(pathToFileURL(`${directory}/feature.mjs`));
  const player = { id: 7, name: 'Ana Perez', identification: 'ABC-123', description: null, active: true };
  function fixture() {
    const calls = [];
    const api = {
      findAll: () => { calls.push(['list']); return of([player]); },
      findOne: id => { calls.push(['detail', id]); return of(player); },
      create: body => { calls.push(['create', body]); return of({ ...player, ...body }); },
      update: (id, body) => { calls.push(['patch', id, body]); return of({ ...player, ...body }); },
      remove: id => { calls.push(['delete', id]); return of({ message: 'Eliminado' }); },
      errorMessage: e => `HTTP ${e.status}`,
    };
    const injector = createEnvironmentInjector([{ provide: PlayersApiService, useValue: api }]);
    const component = runInInjectionContext(injector, () => new PlayersManagementComponent());
    component.editor = { nativeElement: { close() { calls.push(['close']); }, showModal() {} } };
    component.loaded = true;
    return { component, api, calls, destroy: () => injector.destroy() };
  }

  test('uses the exact five HTTP methods and configurable negocio base', () => {
    const calls = [];
    const http = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [method, (...args) => { calls.push([method, ...args]); return of([]); }]));
    const injector = createEnvironmentInjector([{ provide: HttpClient, useValue: http }]);
    try {
      const api = runInInjectionContext(injector, () => new PlayersApiService());
      api.findAll(); api.findOne(7); api.create({ name: 'Ana' }); api.update(7, { active: false }); api.remove(7);
      const base = 'http://localhost:3001/negocio/players';
      assert.deepEqual(calls, [['get', base], ['get', `${base}/7`], ['post', base, { name: 'Ana' }], ['patch', `${base}/7`, { active: false }], ['delete', `${base}/7`]]);
    } finally { injector.destroy(); }
  });

  test('filters by name or identification and counts real active rows', () => {
    const f = fixture();
    try {
      f.component.players = [player, { ...player, id: 8, identification: null, active: false }];
      assert.equal(f.component.activePlayersCount, 1);
      f.component.search = ' abc-123 ';
      assert.deepEqual(f.component.filteredPlayers.map(p => p.id), [7]);
      f.component.search = 'ANA';
      assert.equal(f.component.filteredPlayers.length, 2);
      f.component.statusFilter = 'inactive';
      assert.deepEqual(f.component.filteredPlayers.map(p => p.id), [8]);
    } finally { f.destroy(); }
  });

  test('validates required name, optional identification and UTF-8 description size', () => {
    const f = fixture();
    try {
      f.component.form = { name: 'Ana', identification: '', description: '', active: true };
      assert.equal(f.component.validFields, true);
      for (const [key, value] of [['name', '  '], ['name', 'a'.repeat(181)], ['identification', '  '], ['identification', 'a'.repeat(81)], ['description', 'a'.repeat(65536)]]) {
        const previous = f.component.form[key]; f.component.form[key] = value;
        assert.equal(f.component.validFields, false); f.component.form[key] = previous;
      }
    } finally { f.destroy(); }
  });

  test('creates with null identification, allows repeated names and refreshes', async () => {
    const f = fixture();
    try {
      f.component.players = [player];
      f.component.form = { name: ' Ana Perez ', identification: '', description: '', active: true };
      await f.component.save();
      assert.deepEqual(f.calls[0], ['create', { name: 'Ana Perez', identification: null, description: null }]);
      assert.ok(f.calls.some(c => c[0] === 'list'));
      assert.ok(f.component.message); assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('partial PATCH clears identification and sets false without sending internal fields', async () => {
    const f = fixture();
    try {
      f.component.editing = player;
      f.component.form = { name: player.name, identification: '', description: '', active: false };
      await f.component.save();
      assert.deepEqual(f.calls[0], ['patch', 7, { identification: null, active: false }]);
    } finally { f.destroy(); }
  });

  test('duplicate identification keeps the editor open and reports the conflict', async () => {
    const f = fixture();
    try {
      f.api.create = () => throwError(() => new HttpErrorResponse({ status: 409 }));
      f.component.form = { name: 'Ana', identification: 'ABC-123', description: '', active: true };
      await f.component.save();
      assert.equal(f.component.formError, 'HTTP 409');
      assert.ok(!f.calls.some(c => c[0] === 'close'));
      assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('detail is fetched from the backend', async () => {
    const f = fixture();
    try { await f.component.showDetail(player); assert.deepEqual(f.calls[0], ['detail', 7]); assert.equal(f.component.selected, player); }
    finally { f.destroy(); }
  });

  test('activation uses PATCH and refreshes', async () => {
    const f = fixture();
    try { await f.component.toggleActive(player); assert.deepEqual(f.calls[0], ['patch', 7, { active: false }]); assert.ok(f.calls.some(c => c[0] === 'list')); }
    finally { f.destroy(); }
  });

  test('deletion requires confirmation and clears the selection after success', async () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const f = fixture();
    try {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm: () => false } });
      await f.component.remove(player); assert.equal(f.calls.length, 0);
      window.confirm = () => true; f.component.selected = player;
      await f.component.remove(player);
      assert.deepEqual(f.calls[0], ['delete', 7]); assert.equal(f.component.selected, null);
      assert.ok(f.calls.some(c => c[0] === 'list'));
    } finally { f.destroy(); if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; }
  });

  test('error handling distinguishes connectivity, authorization and duplicate identification', () => {
    const injector = createEnvironmentInjector([{ provide: HttpClient, useValue: {} }]);
    try {
      const api = runInInjectionContext(injector, () => new PlayersApiService());
      for (const status of [0, 400, 401, 403, 404, 409]) assert.ok(api.errorMessage(new HttpErrorResponse({ status })));
      assert.equal(api.errorMessage(new HttpErrorResponse({ status: 409, error: { message: 'Ya existe un jugador con esa identificacion' } })), 'Ya existe un jugador con esa identificacion');
    } finally { injector.destroy(); }
  });

  test('the existing interceptor forwards the same session JWT to players', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'unit-test-session-token' } });
    const injector = createEnvironmentInjector([AuthSessionState]);
    try {
      let authorization;
      runInInjectionContext(injector, () => negocioAuthInterceptor(new HttpRequest('GET', 'http://localhost:3001/negocio/players'), req => { authorization = req.headers.get('Authorization'); return of(null); })).subscribe();
      assert.equal(authorization, 'Bearer unit-test-session-token');
    } finally { injector.destroy(); if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
  });
} finally {
  if (!resolve(directory).startsWith(fileURLToPath(new URL('./', import.meta.url)) + (fileURLToPath(new URL('./', import.meta.url)).endsWith(sep) ? '' : sep))) throw new Error('Unexpected temporary directory');
  await rm(directory, { recursive: true, force: true });
}

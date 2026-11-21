import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relative, isAbsolute } from 'node:path';
import { createEnvironmentInjector, runInInjectionContext, SimpleChange } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';

const directory = await mkdtemp(new URL('./.team-sports-test-', import.meta.url));
try {
  await build({
    stdin: {
      contents: `export { TeamSportsComponent } from './src/app/features/team-sports/team-sports.component';
        export { TeamSportsApiService } from './src/app/features/team-sports/team-sports-api.service';
        export { SportsApiService } from './src/app/features/sports/sports-api.service';
        export { negocioAuthInterceptor } from './src/app/negocio-auth.interceptor';
        export { AuthSessionState } from './src/app/auth-session-state.service';`,
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, packages: 'external', platform: 'node', format: 'esm',
    outfile: `${directory}/feature.mjs`, tsconfig: 'tsconfig.json',
  });
  const { TeamSportsComponent, TeamSportsApiService, SportsApiService,
    negocioAuthInterceptor, AuthSessionState } = await import(pathToFileURL(`${directory}/feature.mjs`));
  const baseUrl = 'http://localhost:3001/negocio';
  const team = { id: 1, name: 'Equipo de prueba', description: null, active: true };
  const sport = { id: 2, name: 'Disciplina de prueba', description: null, active: true, parentId: null };
  const otherSport = { ...sport, id: 3, name: 'Otra disciplina' };
  const association = { id: 5, teamId: 1, sportId: 2, team, sport };

  function fixture(initial = []) {
    let rows = initial;
    const calls = [];
    const api = {
      findByTeam: id => of(rows.filter(row => row.teamId === id)),
      create: body => { calls.push(['create', body]); rows = [...rows, { ...association, ...body }]; return of(rows.at(-1)); },
      remove: (teamId, sportId) => { calls.push(['remove', teamId, sportId]); rows = rows.filter(row => row.teamId !== teamId || row.sportId !== sportId); return of({ message: 'Retirada' }); },
      errorMessage: error => `HTTP ${error.status}`,
    };
    const sportsApi = { findAll: () => of([sport, otherSport]), errorMessage: error => `Catálogo HTTP ${error.status}` };
    const injector = createEnvironmentInjector([
      { provide: TeamSportsApiService, useValue: api }, { provide: SportsApiService, useValue: sportsApi },
    ]);
    const component = runInInjectionContext(injector, () => new TeamSportsComponent());
    const select = next => {
      const previous = component.team;
      component.team = next;
      component.ngOnChanges({ team: new SimpleChange(previous, next, previous === undefined) });
    };
    return { component, api, sportsApi, calls, select, setRows: next => { rows = next; }, destroy: () => injector.destroy() };
  }

  test('the service uses the four exact routes and methods', () => {
    const calls = [];
    const http = Object.fromEntries(['get', 'post', 'delete'].map(method => [method, (...args) => { calls.push([method, ...args]); return of([]); }]));
    const injector = createEnvironmentInjector([{ provide: HttpClient, useValue: http }]);
    try {
      const api = runInInjectionContext(injector, () => new TeamSportsApiService());
      api.create({ teamId: 1, sportId: 2 }).subscribe();
      api.findByTeam(1).subscribe(); api.findBySport(2).subscribe(); api.remove(1, 2).subscribe();
      assert.deepEqual(calls, [
        ['post', `${baseUrl}/team-sports`, { teamId: 1, sportId: 2 }],
        ['get', `${baseUrl}/team-sports/teams/1`], ['get', `${baseUrl}/team-sports/sports/2`],
        ['delete', `${baseUrl}/team-sports/1/2`],
      ]);
    } finally { injector.destroy(); }
  });

  test('the existing interceptor forwards the session token only to negocio', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'unit-test-token' } });
    const injector = createEnvironmentInjector([AuthSessionState]);
    try {
      for (const [url, expected] of [[`${baseUrl}/team-sports/teams/1`, 'Bearer unit-test-token'], ['https://example.invalid/negocio/team-sports', null]]) {
        runInInjectionContext(injector, () => negocioAuthInterceptor(new HttpRequest('GET', url), request => of(request)))
          .subscribe(request => assert.equal(request.headers.get('Authorization'), expected));
      }
    } finally {
      injector.destroy();
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
    }
  });

  test('assigned sports are excluded and cannot be submitted again', () => {
    const f = fixture([association]);
    try {
      f.select(team);
      assert.deepEqual(f.component.availableSports.map(s => s.id), [3]);
      f.component.selectedSportId = 2; f.component.associate();
      assert.equal(f.component.canAssociate, false); assert.deepEqual(f.calls, []);
    } finally { f.destroy(); }
  });

  test('creation refreshes associations and available choices', () => {
    const f = fixture();
    try {
      f.select(team); f.component.selectedSportId = 2; f.component.associate();
      assert.deepEqual(f.calls, [['create', { teamId: 1, sportId: 2 }]]);
      assert.equal(f.component.associations.length, 1);
      assert.deepEqual(f.component.availableSports.map(s => s.id), [3]);
      assert.equal(f.component.selectedSportId, null); assert.ok(f.component.message);
    } finally { f.destroy(); }
  });

  test('removal requires confirmation and targets only the association', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let confirmed = false;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm: () => confirmed } });
    const f = fixture([association]);
    try {
      f.select(team); f.component.removeAssociation(association); assert.deepEqual(f.calls, []);
      confirmed = true; f.component.removeAssociation(association);
      assert.deepEqual(f.calls, [['remove', 1, 2]]); assert.deepEqual(f.component.associations, []);
      assert.deepEqual(f.component.availableSports.map(s => s.id), [2, 3]);
    } finally {
      f.destroy();
      if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window;
    }
  });

  test('a concurrent duplicate refreshes state while preserving the error', () => {
    const f = fixture();
    try {
      f.select(team); f.component.selectedSportId = 2;
      f.api.create = () => { f.setRows([association]); return throwError(() => new HttpErrorResponse({ status: 409 })); };
      f.component.associate();
      assert.equal(f.component.actionError, 'HTTP 409');
      assert.deepEqual(f.component.availableSports.map(s => s.id), [3]); assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('a pending result for a previous team cannot overwrite a new selection', () => {
    const f = fixture(); const pending = new Subject();
    try {
      f.select(team); f.component.selectedSportId = 2; f.api.create = () => pending; f.component.associate();
      f.select({ ...team, id: 4, name: 'Otro equipo' }); pending.next(association); pending.complete();
      assert.equal(f.component.team.id, 4); assert.deepEqual(f.component.associations, []);
      assert.equal(f.component.message, ''); assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('a forbidden catalog preserves loaded associations and disables creation', () => {
    const f = fixture([association]);
    try {
      f.sportsApi.findAll = () => throwError(() => new HttpErrorResponse({ status: 403 })); f.select(team);
      assert.equal(f.component.associationsLoaded, true); assert.equal(f.component.associations.length, 1);
      assert.equal(f.component.catalogLoaded, false); assert.equal(f.component.catalogError, 'Catálogo HTTP 403');
      assert.equal(f.component.canAssociate, false);
    } finally { f.destroy(); }
  });
} finally {
  const child = relative(fileURLToPath(new URL('./', import.meta.url)), directory);
  if (!child || child.startsWith('..') || isAbsolute(child)) throw new Error('Unsafe temporary cleanup path');
  await rm(directory, { recursive: true, force: true });
}

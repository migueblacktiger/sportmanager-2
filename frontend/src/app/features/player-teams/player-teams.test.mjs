import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { of, Subject, throwError, TimeoutError } from 'rxjs';

const directory = await mkdtemp(new URL('./.player-teams-test-', import.meta.url));
try {
  await build({
    stdin: { contents: `export { PlayerTeamsComponent } from './src/app/features/player-teams/player-teams.component';
      export { PlayerTeamsApiService } from './src/app/features/player-teams/player-teams-api.service';
      export { TeamsManagementComponent } from './src/app/features/teams/teams-management.component';
      export { TeamsApiService } from './src/app/features/teams/teams-api.service';
      export { PlayersManagementComponent } from './src/app/features/players/players-management.component';
      export { PlayersApiService } from './src/app/features/players/players-api.service';
      export { negocioAuthInterceptor } from './src/app/negocio-auth.interceptor';
      export { AuthSessionState } from './src/app/auth-session-state.service';`, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: `${directory}/feature.mjs`, tsconfig: 'tsconfig.json',
  });
  const { PlayerTeamsComponent, PlayerTeamsApiService, PlayersApiService, TeamsManagementComponent, TeamsApiService, PlayersManagementComponent, negocioAuthInterceptor, AuthSessionState } = await import(pathToFileURL(`${directory}/feature.mjs`));
  const player = { id: 2, name: 'Ana', identification: 'TEST-2', description: null, active: false };
  const team = { id: 3, name: 'Equipo', description: null, active: true };
  const row = { id: 7, playerId: 2, teamId: 3, startDate: '2026-11-01', endDate: '2026-11-30', finishedAt: null, status: 'vigente', player, team };

  function fixture(initial = []) {
    const calls = []; let rows = initial;
    const api = {
      findByTeam: id => { calls.push(['team', id]); return of(rows.filter(r => r.teamId === id)); },
      findByPlayer: id => { calls.push(['player', id]); return of(rows.filter(r => r.playerId === id)); },
      create: body => { calls.push(['create', body]); rows = [...rows, { ...row, ...body, id: 8 }]; return of(rows.at(-1)); },
      finish: id => { calls.push(['finish', id]); rows = rows.map(r => r.id === id ? { ...r, status: 'finalizada', finishedAt: '2026-11-22T15:00:00.000Z' } : r); return of(rows.find(r => r.id === id)); },
      errorMessage: error => `HTTP ${error.status ?? 'unknown'}`,
    };
    const playersApi = { findAll: () => { calls.push(['catalog']); return of([player]); }, errorMessage: error => `Catalog HTTP ${error.status}` };
    const injector = createEnvironmentInjector([{ provide: PlayerTeamsApiService, useValue: api }, { provide: PlayersApiService, useValue: playersApi }]);
    const component = runInInjectionContext(injector, () => new PlayerTeamsComponent());
    return {
      component, api, playersApi, calls,
      selectTeam: value => { component.team = value; component.player = null; component.ngOnChanges(); },
      selectPlayer: value => { component.player = value; component.team = null; component.ngOnChanges(); },
      setRows: value => { rows = value; }, destroy: () => injector.destroy(),
    };
  }
  function fill(component, extra = {}) { component.form = { playerId: 2, startDate: '2026-12-01', endDate: '2026-12-31', ...extra }; }

  for (const [label, Component, Api, record] of [
    ['Equipos', TeamsManagementComponent, TeamsApiService, team],
    ['Jugadores', PlayersManagementComponent, PlayersApiService, player],
  ]) {
    function accessFixture(findOne = id => of({ ...record, id })) {
      const calls = [];
      const api = { findOne: id => { calls.push(['detail', id]); return findOne(id); }, errorMessage: () => 'No se pudo consultar el detalle' };
      const injector = createEnvironmentInjector([{ provide: Api, useValue: api }]);
      const component = runInInjectionContext(injector, () => new Component());
      component.contractsSection = { nativeElement: { isConnected: true, scrollIntoView: options => calls.push(['scroll', options]), focus: options => calls.push(['focus', options]) } };
      return { component, calls, destroy: () => injector.destroy() };
    }

    test(`${label}: explicit contract access fetches the real selected ID, then scrolls and focuses the section`, async () => {
      const previous = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
      const frames = [];
      Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: callback => { frames.push(callback); return frames.length; } });
      const f = accessFixture();
      try {
        await f.component.showContracts(record);
        assert.deepEqual(f.calls, [['detail', record.id]]);
        assert.equal(f.component.selected.id, record.id);
        assert.equal(frames.length, 1); frames[0]();
        assert.deepEqual(f.calls.slice(1), [['scroll', { behavior: 'auto', block: 'start' }], ['focus', { preventScroll: true }]]);
      } finally { f.destroy(); if (previous) Object.defineProperty(globalThis, 'requestAnimationFrame', previous); else delete globalThis.requestAnimationFrame; }
    });

    test(`${label}: failed detail lookup does not open or focus unrelated contracts`, async () => {
      const f = accessFixture(() => throwError(() => new HttpErrorResponse({ status: 404 })));
      try {
        await f.component.showContracts(record);
        assert.ok(f.component.error); assert.equal(f.component.selected, null);
        assert.deepEqual(f.calls, [['detail', record.id]]);
      } finally { f.destroy(); }
    });

    test(`${label}: busy state prevents duplicate detail requests`, async () => {
      const f = accessFixture();
      try { f.component.saving = true; await f.component.showContracts(record); assert.equal(f.calls.length, 0); }
      finally { f.destroy(); }
    });

    test(`${label}: deferred focus does not jump to a different selected record`, async () => {
      const previous = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
      let callback;
      Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: action => { callback = action; return 1; } });
      const f = accessFixture();
      try {
        await f.component.showContracts(record); f.component.selected = { ...record, id: 999 }; callback();
        assert.deepEqual(f.calls, [['detail', record.id]]);
      } finally { f.destroy(); if (previous) Object.defineProperty(globalThis, 'requestAnimationFrame', previous); else delete globalThis.requestAnimationFrame; }
    });
  }

  test('API uses the four real routes, PATCH for finish and optional status queries', () => {
    const calls = [];
    const http = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, (...args) => { calls.push([method, ...args]); return of([]); }]));
    const injector = createEnvironmentInjector([{ provide: HttpClient, useValue: http }]);
    try {
      const api = runInInjectionContext(injector, () => new PlayerTeamsApiService());
      const body = { playerId: 2, teamId: 3, startDate: row.startDate, endDate: row.endDate };
      api.create(body); api.findByTeam(3); api.findByPlayer(2); api.finish(7); api.findByPlayer(2, 'finalizada');
      const base = 'http://localhost:3001/negocio/player-teams';
      assert.deepEqual(calls, [['post', base, body], ['get', `${base}/teams/3`, undefined], ['get', `${base}/players/2`, undefined], ['patch', `${base}/7/finish`, {}], ['get', `${base}/players/2`, { params: { status: 'finalizada' } }]]);
      assert.equal('remove' in api, false);
    } finally { injector.destroy(); }
  });

  test('API explains validation, session, permissions, missing records, overlap and connection failures', () => {
    const injector = createEnvironmentInjector([{ provide: HttpClient, useValue: {} }]);
    try {
      const api = runInInjectionContext(injector, () => new PlayerTeamsApiService());
      for (const status of [0, 400, 401, 403, 404, 409, 503, 500]) assert.ok(api.errorMessage(new HttpErrorResponse({ status })).length);
      assert.match(api.errorMessage(new HttpErrorResponse({ status: 409 })), /solapa/);
      assert.equal(api.errorMessage(new HttpErrorResponse({ status: 409, error: { message: 'Periodo efectivo solapado' } })), 'Periodo efectivo solapado');
      assert.equal(api.errorMessage(new HttpErrorResponse({ status: 400, error: { message: ['Fecha invalida', 'Jugador obligatorio'] } })), 'Fecha invalida · Jugador obligatorio');
      assert.match(api.errorMessage(new TimeoutError()), /podría haberse guardado/);
    } finally { injector.destroy(); }
  });

  test('team context loads history and all real players including inactive and previously assigned players', () => {
    const f = fixture([row]);
    try {
      f.selectTeam(team); fill(f.component);
      assert.deepEqual(f.calls, [['team', 3], ['catalog']]);
      assert.equal(f.component.players[0].active, false);
      assert.equal(f.component.players[0].id, row.playerId);
      assert.equal(f.component.canAssign, true);
    } finally { f.destroy(); }
  });

  test('player context reuses history without a creation catalog or mutation controls', () => {
    const f = fixture([row]);
    try {
      f.selectPlayer(player); fill(f.component); f.component.assign(); f.component.finish(row);
      assert.deepEqual(f.calls, [['player', 2]]); assert.equal(f.component.canAssign, false);
      assert.equal(f.component.contracts.length, 1); assert.equal(f.component.teamMode, false);
    } finally { f.destroy(); }
  });

  test('requires an existing player and real, ordered calendar dates', () => {
    const f = fixture();
    try {
      f.selectTeam(team);
      for (const invalid of [{ playerId: null }, { playerId: 99 }, { startDate: '' }, { endDate: '' }, { startDate: '2026-02-29' }, { endDate: '2026-11-30' }, { startDate: '2026-12-01T00:00:00Z' }, { startDate: '0000-01-01' }]) {
        fill(f.component, invalid); assert.equal(f.component.canAssign, false); f.component.assign();
      }
      assert.ok(!f.calls.some(c => c[0] === 'create'));
      fill(f.component, { startDate: '2028-02-29', endDate: '2028-02-29' }); assert.equal(f.component.canAssign, true);
      f.component.contextBusy = true; assert.equal(f.component.canAssign, false);
    } finally { f.destroy(); }
  });

  test('does not add exclusivity, active-state or future-only date restrictions', () => {
    const f = fixture([row, { ...row, id: 10, teamId: 9 }]);
    try {
      f.selectTeam({ ...team, active: false }); fill(f.component); assert.equal(f.component.canAssign, true);
      fill(f.component, { startDate: '2020-01-01', endDate: '2020-01-02' }); assert.equal(f.component.canAssign, true);
    } finally { f.destroy(); }
  });

  test('assignment sends only contractual input, refreshes history and resets the form', () => {
    const f = fixture([row]);
    try {
      f.selectTeam(team); fill(f.component); f.component.assign();
      assert.deepEqual(f.calls.find(c => c[0] === 'create'), ['create', { teamId: 3, playerId: 2, startDate: '2026-12-01', endDate: '2026-12-31' }]);
      assert.equal(f.component.contracts.length, 2); assert.equal(f.component.form.playerId, null);
      assert.ok(f.component.message); assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('409 preserves the entered dates, displays an error and refreshes concurrent server state', () => {
    const f = fixture([row]);
    try {
      f.selectTeam(team); fill(f.component);
      f.api.create = () => throwError(() => new HttpErrorResponse({ status: 409 }));
      f.component.assign();
      assert.equal(f.component.actionError, '');
      assert.equal(f.component.overlapError, 'Este jugador ya tiene una asignación con fechas que se superponen en este equipo. Selecciona otras fechas');
      assert.equal(f.component.form.startDate, '2026-12-01');
      assert.equal(f.calls.filter(c => c[0] === 'team').length, 2); assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('overlap warning survives history refresh and is cleared when dates change', () => {
    const f = fixture([row]);
    try {
      f.selectTeam(team); fill(f.component);
      f.api.create = () => throwError(() => new HttpErrorResponse({ status: 409 }));
      f.component.assign(); const message = f.component.overlapError;
      f.component.refresh(); assert.equal(f.component.overlapError, message);
      assert.ok(message); assert.equal(f.component.form.startDate, '2026-12-01');
      f.component.form.endDate = '2027-01-01'; f.component.clearOverlapError();
      assert.equal(f.component.overlapError, '');
    } finally { f.destroy(); }
  });

  test('another assignment attempt clears the previous overlap warning while pending', () => {
    const f = fixture(); const pending = new Subject();
    try {
      f.selectTeam(team); fill(f.component);
      f.api.create = () => throwError(() => new HttpErrorResponse({ status: 409 }));
      f.component.assign(); assert.ok(f.component.overlapError);
      f.api.create = () => pending; f.component.assign();
      assert.equal(f.component.overlapError, ''); assert.equal(f.component.saving, true);
    } finally { f.destroy(); }
  });

  test('non-overlap errors retain their existing messages', () => {
    const f = fixture();
    try {
      f.selectTeam(team); fill(f.component);
      for (const status of [0, 400, 401, 403, 404, 500]) {
        f.api.create = () => throwError(() => new HttpErrorResponse({ status }));
        f.component.assign();
        assert.equal(f.component.actionError, `HTTP ${status}`); assert.equal(f.component.overlapError, '');
      }
    } finally { f.destroy(); }
  });

  test('a conflict during finishing keeps the existing generic error behavior', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const f = fixture([row]);
    try {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm: () => true } });
      f.selectTeam(team);
      f.api.finish = () => throwError(() => new HttpErrorResponse({ status: 409 }));
      f.component.finish(row);
      assert.equal(f.component.actionError, 'HTTP 409'); assert.equal(f.component.overlapError, '');
    } finally { f.destroy(); if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; }
  });

  test('a late conflict response does not add a warning to another selected team', () => {
    const f = fixture(); const pending = new Subject();
    try {
      f.selectTeam(team); fill(f.component); f.api.create = () => pending; f.component.assign();
      f.selectTeam({ ...team, id: 9 });
      pending.error(new HttpErrorResponse({ status: 409 }));
      assert.equal(f.component.overlapError, ''); assert.equal(f.component.actionError, '');
    } finally { f.destroy(); }
  });

  test('unknown mutation failures are not retried automatically', () => {
    const f = fixture(); let attempts = 0;
    try {
      f.selectTeam(team); fill(f.component);
      f.api.create = () => { attempts++; return throwError(() => new TimeoutError()); };
      f.component.assign(); assert.equal(attempts, 1); assert.ok(f.component.actionError); assert.equal(f.component.saving, false);
    } finally { f.destroy(); }
  });

  test('finish requires confirmation, uses contract ID and retains dates and history', () => {
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const f = fixture([row]);
    try {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm: () => false } });
      f.selectTeam(team); f.component.finish(row); assert.ok(!f.calls.some(c => c[0] === 'finish'));
      window.confirm = () => true; f.component.finish(row);
      assert.deepEqual(f.calls.find(c => c[0] === 'finish'), ['finish', 7]);
      assert.equal(f.component.contracts.length, 1); assert.equal(f.component.contracts[0].status, 'finalizada');
      assert.equal(f.component.contracts[0].startDate, row.startDate); assert.equal(f.component.contracts[0].endDate, row.endDate);
      assert.equal(f.component.contracts[0].finishedAt, '2026-11-22T15:00:00.000Z');
      assert.equal(f.component.canFinish(f.component.contracts[0]), false);
    } finally { f.destroy(); if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else delete globalThis.window; }
  });

  test('cannot finish a contract from another team or an expired/finalized contract', () => {
    const f = fixture([row]);
    try {
      f.selectTeam(team);
      for (const invalid of [{ ...row, teamId: 9 }, { ...row, status: 'vencida' }, { ...row, status: 'finalizada' }]) f.component.finish(invalid);
      assert.ok(!f.calls.some(c => c[0] === 'finish'));
    } finally { f.destroy(); }
  });

  test('filters server-provided statuses without recalculating or dropping historical data', () => {
    const rows = ['vigente', 'programada', 'vencida', 'finalizada'].map((status, i) => ({ ...row, id: 7 + i, status }));
    const f = fixture(rows);
    try {
      f.selectPlayer(player); assert.equal(f.component.filteredContracts.length, 4);
      f.component.statusFilter = 'finalizada'; assert.deepEqual(f.component.filteredContracts.map(r => r.id), [10]);
      assert.equal(f.component.contracts.length, 4);
      assert.equal(f.component.formatDate('2026-11-01'), '01/11/2026');
      assert.match(f.component.formatFinished('2026-11-22T15:00:00.000Z'), /10:00/);
    } finally { f.destroy(); }
  });

  test('switching selected entities cancels stale history subscriptions', () => {
    const f = fixture(); const pending = new Subject();
    try {
      f.api.findByTeam = () => pending;
      f.selectTeam(team); assert.equal(f.component.loading, true); assert.equal(pending.observers.length, 1);
      f.selectPlayer(player); assert.equal(pending.observers.length, 0);
      pending.next([row]); assert.equal(f.component.contracts.length, 0); assert.equal(f.component.playerMode, true);
    } finally { f.destroy(); }
  });

  test('late mutation responses cannot overwrite a newly selected team or its form', () => {
    const f = fixture(); const pending = new Subject();
    try {
      f.api.create = () => pending;
      f.selectTeam(team); fill(f.component); f.component.assign(); assert.equal(f.component.saving, true);
      f.selectTeam({ ...team, id: 9 }); fill(f.component, { startDate: '2027-01-01', endDate: '2027-01-31' });
      pending.next(row); pending.complete();
      assert.equal(f.component.team.id, 9); assert.equal(f.component.form.startDate, '2027-01-01'); assert.equal(f.component.message, '');
    } finally { f.destroy(); }
  });

  test('read failures show an error rather than an invented empty successful history', () => {
    const f = fixture();
    try {
      f.api.findByTeam = () => throwError(() => new HttpErrorResponse({ status: 403 }));
      f.selectTeam(team); assert.equal(f.component.loaded, false); assert.equal(f.component.loading, false); assert.equal(f.component.historyError, 'HTTP 403');
      fill(f.component); assert.equal(f.component.canAssign, false);
    } finally { f.destroy(); }
  });

  test('component destruction releases pending requests', () => {
    const f = fixture(); const pending = new Subject();
    f.api.findByPlayer = () => pending;
    f.selectPlayer(player); assert.equal(pending.observers.length, 1); f.destroy(); assert.equal(pending.observers.length, 0);
  });

  test('the existing interceptor supplies the current JWT for contract requests', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'unit-test-session' } });
    const injector = createEnvironmentInjector([AuthSessionState]);
    try {
      let authorization;
      runInInjectionContext(injector, () => negocioAuthInterceptor(new HttpRequest('PATCH', 'http://localhost:3001/negocio/player-teams/7/finish', {}), req => { authorization = req.headers.get('Authorization'); return of(null); })).subscribe();
      assert.equal(authorization, 'Bearer unit-test-session');
    } finally { injector.destroy(); if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
  });
} finally {
  const root = fileURLToPath(new URL('./', import.meta.url));
  if (!resolve(directory).startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Unexpected temporary directory');
  await rm(directory, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(new URL('./.firebase-config-test-', import.meta.url));
const output = `${directory}/firebase-config.mjs`;
await build({
  entryPoints: ['src/app/firebase-config.ts'], bundle: true, platform: 'node', format: 'esm', outfile: output
});

try {
  const { firebaseWebConfig } = await import(pathToFileURL(output));

  test('Firebase remains unavailable without a complete public web configuration', () => {
    globalThis.window = {};
    assert.equal(firebaseWebConfig(), null);
    globalThis.window.__SPORTMANAGER_FIREBASE_CONFIG__ = { projectId: 'sportmanager' };
    assert.equal(firebaseWebConfig(), null);
  });

  test('Firebase accepts only a complete public web configuration', () => {
    globalThis.window = { __SPORTMANAGER_FIREBASE_CONFIG__: {
      apiKey: 'public-api-key', authDomain: 'sportmanager.firebaseapp.com',
      projectId: 'sportmanager', appId: '1:123:web:abc'
    }};
    assert.deepEqual(firebaseWebConfig(), globalThis.window.__SPORTMANAGER_FIREBASE_CONFIG__);
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}

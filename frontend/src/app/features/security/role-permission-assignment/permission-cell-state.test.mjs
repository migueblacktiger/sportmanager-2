import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countAssignedPermissions,
  permissionCellState,
  samePermissionIds,
  togglePermissionCell
} from './permission-cell-state.ts';

test('an empty cell is unavailable and cannot change assignments', () => {
  const assigned = new Set([9]);
  assert.equal(permissionCellState([], assigned), 'unavailable');
  assert.deepEqual(togglePermissionCell([], assigned), assigned);
});

test('a cell with no assigned permission is unchecked', () => {
  assert.equal(permissionCellState([1, 2], new Set()), 'unassigned');
});

test('a cell with every permission assigned is checked', () => {
  assert.equal(permissionCellState([1, 2], new Set([1, 2])), 'assigned');
});

test('a cell with some permissions assigned has a partial state', () => {
  assert.equal(permissionCellState([1, 2], new Set([1])), 'partial');
});

test('activating a partially assigned cell assigns all its permissions', () => {
  assert.deepEqual(togglePermissionCell([1, 2], new Set([1])), new Set([1, 2]));
});

test('deactivating a fully assigned cell removes all its permissions', () => {
  assert.deepEqual(togglePermissionCell([1, 2], new Set([1, 2, 9])), new Set([9]));
});

test('changing a selection back to its saved IDs is not pending', () => {
  assert.equal(samePermissionIds(new Set([1, 2]), new Set([2, 1])), true);
  assert.equal(samePermissionIds(new Set([1, 3]), new Set([1, 2])), false);
});

test('assigned permission statistics count individual permission IDs', () => {
  assert.equal(countAssignedPermissions(new Set([1, 2, 3])), 3);
});

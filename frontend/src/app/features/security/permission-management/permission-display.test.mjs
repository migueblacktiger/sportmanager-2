import assert from 'node:assert/strict';
import test from 'node:test';
import {
  permissionOperationIndex,
  permissionOperationLabel
} from './permission-display.ts';

const permission = (method, url = '/api/resource/{id}') => ({
  id: 1,
  model: 'Resource',
  method,
  url
});

test('known HTTP methods map to the corresponding matrix operations', () => {
  assert.equal(permissionOperationIndex(permission('GET', '/api/users')), 1);
  assert.equal(permissionOperationIndex(permission('GET')), 0);
  assert.equal(permissionOperationIndex(permission('POST')), 2);
  assert.equal(permissionOperationIndex(permission('PUT')), 3);
  assert.equal(permissionOperationIndex(permission('PATCH')), 3);
  assert.equal(permissionOperationIndex(permission('DELETE')), 4);
});

test('an unknown HTTP method is not assigned a matrix operation', () => {
  const unknownPermission = permission('OPTIONS');
  assert.equal(permissionOperationIndex(unknownPermission), null);
  assert.equal(permissionOperationLabel(unknownPermission), 'No clasificada');
});

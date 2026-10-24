export type PermissionCellState = 'assigned' | 'unassigned' | 'partial' | 'unavailable';

export function permissionCellState(
  permissionIds: number[],
  assigned: ReadonlySet<number>
): PermissionCellState {
  if (permissionIds.length === 0) return 'unavailable';

  const assignedCount = permissionIds.filter(id => assigned.has(id)).length;
  if (assignedCount === 0) return 'unassigned';
  if (assignedCount === permissionIds.length) return 'assigned';
  return 'partial';
}

export function togglePermissionCell(
  permissionIds: number[],
  assigned: ReadonlySet<number>
): Set<number> {
  const next = new Set(assigned);
  if (permissionCellState(permissionIds, assigned) === 'assigned') {
    permissionIds.forEach(id => next.delete(id));
  } else {
    permissionIds.forEach(id => next.add(id));
  }
  return next;
}

export function samePermissionIds(first: ReadonlySet<number>, second: ReadonlySet<number>): boolean {
  return first.size === second.size && [...first].every(id => second.has(id));
}

export function countAssignedPermissions(assigned: ReadonlySet<number>): number {
  return assigned.size;
}

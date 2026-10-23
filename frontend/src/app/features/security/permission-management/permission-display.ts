import { PermissionDto } from '../../../api.service';

export const PERMISSION_OPERATIONS = ['Ver', 'Listar', 'Crear', 'Actualizar', 'Eliminar'];

export const PERMISSION_MODEL_LABELS: Record<string, string> = {
  User: 'Usuarios',
  Profile: 'Perfiles',
  Role: 'Roles',
  Permission: 'Permisos',
  UserRole: 'Roles de usuario',
  RolePermission: 'Permisos de rol',
  Session: 'Sesiones'
};

const GET_LIST_ENDPOINTS = new Set([
  '/api/users',
  '/api/profiles',
  '/api/roles',
  '/api/permissions',
  '/api/user-roles',
  '/api/user-roles/users/{userId}',
  '/api/user-roles/roles/{roleId}',
  '/api/role-permissions',
  '/api/role-permissions/roles/{roleId}',
  '/api/users/{userId}/sessions'
]);

export function permissionModelLabel(model: string): string {
  return PERMISSION_MODEL_LABELS[model] ?? model;
}

export function permissionOperationIndex(permission: PermissionDto): number {
  switch (permission.method.toUpperCase()) {
    case 'GET': {
      const url = permission.url.trim().replace(/\/+$/, '');
      return GET_LIST_ENDPOINTS.has(url) ? 1 : 0;
    }
    case 'POST': return 2;
    case 'PUT': case 'PATCH': return 3;
    case 'DELETE': return 4;
    default: return 1;
  }
}

export function permissionOperationLabel(permission: PermissionDto): string {
  return PERMISSION_OPERATIONS[permissionOperationIndex(permission)] ?? permission.method;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL, TOKEN_KEY } from './api.config';

/* ---------- Modelos (espejo de los DTO del backend) ---------- */
export interface UserDto { id: number; name: string; email: string; }
export interface ProfileDto { id: number; userId: number; phone: string; birthDate: string; }
export interface UserDetailDto extends UserDto { profile: ProfileDto | null; }
export interface RoleDto { id: number; name: string; description: string; }
export interface PermissionDto { id: number; url: string; method: string; model: string; }
export interface UserRoleDto { id: number; userId: number; role: RoleDto; }
export interface RolePermissionDto { id: number; roleId: number; permission: PermissionDto; }
export interface AuthResponse {
  token: string;
  expiration: string;
  user: UserDto;
  roles: RoleDto[];
  permissions: PermissionDto[];
}
export interface ApiError { errorCase?: string; message?: string; errors?: Record<string, string>; }

/* ---------- Interceptor: adjunta el token de sesión ---------- */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && req.url.startsWith(API_URL)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  /* Autenticación */
  register(body: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/register`, body);
  }
  login(body: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, body);
  }
  me(): Observable<AuthResponse> { return this.http.get<AuthResponse>(`${API_URL}/auth/me`); }
  logout(): Observable<void> { return this.http.post<void>(`${API_URL}/auth/logout`, {}); }

  /* Usuarios */
  getUsers(): Observable<UserDto[]> { return this.http.get<UserDto[]>(`${API_URL}/users`); }
  getMyUserDetail(): Observable<UserDetailDto> { return this.http.get<UserDetailDto>(`${API_URL}/users/me/detail`); }
  updateMyUser(body: { name: string; email: string; password?: string }): Observable<UserDto> {
    return this.http.put<UserDto>(`${API_URL}/users/me`, body);
  }
  getUserDetail(id: number): Observable<UserDetailDto> { return this.http.get<UserDetailDto>(`${API_URL}/users/${id}/detail`); }
  createUser(body: { name: string; email: string; password: string }): Observable<UserDto> {
    return this.http.post<UserDto>(`${API_URL}/users`, body);
  }
  updateUser(id: number, body: { name: string; email: string; password?: string }): Observable<UserDto> {
    return this.http.put<UserDto>(`${API_URL}/users/${id}`, body);
  }
  deleteUser(id: number): Observable<void> { return this.http.delete<void>(`${API_URL}/users/${id}`); }

  /* Perfiles */
  createProfile(body: { userId: number; phone: string; birthDate: string }): Observable<ProfileDto> {
    return this.http.post<ProfileDto>(`${API_URL}/profiles`, body);
  }
  updateProfile(id: number, body: { phone: string; birthDate: string }): Observable<ProfileDto> {
    return this.http.put<ProfileDto>(`${API_URL}/profiles/${id}`, body);
  }
  saveMyProfile(body: { phone: string; birthDate: string }): Observable<ProfileDto> {
    return this.http.put<ProfileDto>(`${API_URL}/users/me/profile`, body);
  }

  /* Roles */
  getRoles(): Observable<RoleDto[]> { return this.http.get<RoleDto[]>(`${API_URL}/roles`); }
  createRole(body: { name: string; description: string }): Observable<RoleDto> {
    return this.http.post<RoleDto>(`${API_URL}/roles`, body);
  }
  updateRole(id: number, body: { name: string; description: string }): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${API_URL}/roles/${id}`, body);
  }
  deleteRole(id: number): Observable<void> { return this.http.delete<void>(`${API_URL}/roles/${id}`); }

  /* Permisos */
  getPermissions(): Observable<PermissionDto[]> { return this.http.get<PermissionDto[]>(`${API_URL}/permissions`); }
  createPermission(body: { url: string; method: string; model: string }): Observable<PermissionDto> {
    return this.http.post<PermissionDto>(`${API_URL}/permissions`, body);
  }
  updatePermission(id: number, body: { url: string; method: string; model: string }): Observable<PermissionDto> {
    return this.http.put<PermissionDto>(`${API_URL}/permissions/${id}`, body);
  }
  deletePermission(id: number): Observable<void> { return this.http.delete<void>(`${API_URL}/permissions/${id}`); }

  /* Roles de usuario */
  getUserRoles(): Observable<UserRoleDto[]> { return this.http.get<UserRoleDto[]>(`${API_URL}/user-roles`); }
  assignRole(userId: number, roleId: number): Observable<UserRoleDto> {
    return this.http.post<UserRoleDto>(`${API_URL}/user-roles`, { userId, roleId });
  }
  unassignRole(userId: number, roleId: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/user-roles/${userId}/${roleId}`);
  }

  /* Permisos de rol */
  getRolePermissions(): Observable<RolePermissionDto[]> { return this.http.get<RolePermissionDto[]>(`${API_URL}/role-permissions`); }
  getPermissionsOfRole(roleId: number): Observable<RolePermissionDto[]> {
    return this.http.get<RolePermissionDto[]>(`${API_URL}/role-permissions/roles/${roleId}`);
  }
  replacePermissionsOfRole(roleId: number, permissionIds: number[]): Observable<RolePermissionDto[]> {
    return this.http.put<RolePermissionDto[]>(`${API_URL}/role-permissions/roles/${roleId}`, { permissionIds });
  }

  /* Mensaje legible a partir de un error HTTP */
  errorMessage(e: unknown): string {
    const err = e as HttpErrorResponse;
    if (err?.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en ' + API_URL.replace('/api', '') + '.';
    }
    const body = (err?.error ?? {}) as ApiError;
    if (body.errors && Object.keys(body.errors).length) {
      return Object.values(body.errors).join(' · ');
    }
    return body.message || `Error inesperado (${err?.status ?? '?'}).`;
  }
}

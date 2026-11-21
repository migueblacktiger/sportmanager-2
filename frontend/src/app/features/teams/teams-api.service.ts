import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout, TimeoutError } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';

export interface TeamDto {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}
export interface CreateTeamRequest {
  name: string;
  description?: string | null;
}
export type UpdateTeamRequest = Partial<CreateTeamRequest> & { active?: boolean };

@Injectable({ providedIn: 'root' })
export class TeamsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/teams`;

  findAll() { return this.http.get<TeamDto[]>(this.url).pipe(timeout(15000)); }
  findOne(id: number) { return this.http.get<TeamDto>(`${this.url}/${id}`).pipe(timeout(15000)); }
  create(body: CreateTeamRequest) { return this.http.post<TeamDto>(this.url, body).pipe(timeout(15000)); }
  update(id: number, body: UpdateTeamRequest) {
    return this.http.patch<TeamDto>(`${this.url}/${id}`, body).pipe(timeout(15000));
  }
  remove(id: number) {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Actualiza el listado antes de repetir la operación.';
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servicio de equipos. Comprueba que NestJS esté disponible y que CORS permita este origen.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes el permiso necesario para esta operación de equipos.';
      case 404: return 'No se encontró el equipo. Actualiza la información.';
      case 503: return 'El servicio de equipos no pudo comprobar tus permisos. Inténtalo más tarde.';
      case 400:
      case 409: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' · ');
        return error.status === 409 ? 'El equipo tiene información asociada que impide esta operación.' : 'Revisa los datos del formulario.';
      }
      default: return 'Ocurrió un error en el servidor. No se pudo confirmar la operación; actualiza el listado antes de reintentar.';
    }
  }
}

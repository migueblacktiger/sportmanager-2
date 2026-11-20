import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout, TimeoutError } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';

export interface SportDto {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  parentId: number | null;
}
export interface CreateSportRequest {
  name: string;
  description?: string | null;
  parentId?: number | null;
}
export type UpdateSportRequest = Partial<CreateSportRequest> & { active?: boolean };

@Injectable({ providedIn: 'root' })
export class SportsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/sports`;

  findAll() { return this.http.get<SportDto[]>(this.url).pipe(timeout(15000)); }
  findOne(id: number) { return this.http.get<SportDto>(`${this.url}/${id}`).pipe(timeout(15000)); }
  create(body: CreateSportRequest) { return this.http.post<SportDto>(this.url, body).pipe(timeout(15000)); }
  update(id: number, body: UpdateSportRequest) {
    return this.http.patch<SportDto>(`${this.url}/${id}`, body).pipe(timeout(15000));
  }
  remove(id: number) {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Actualiza el listado antes de repetir la operación.';
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servicio de deportes. Comprueba que NestJS esté disponible y que CORS permita este origen.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes el permiso necesario para esta operación de deportes.';
      case 404: return 'No se encontró el deporte o su padre. Actualiza la información.';
      case 503: return 'El servicio de deportes no pudo comprobar tus permisos. Inténtalo más tarde.';
      case 400:
      case 409: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' · ');
        return error.status === 409 ? 'La operación entra en conflicto con un nombre o una relación existente.' : 'Revisa los datos del formulario.';
      }
      default: return 'Ocurrió un error en el servidor. No se pudo confirmar la operación; actualiza el listado antes de reintentar.';
    }
  }
}

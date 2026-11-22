import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TimeoutError, timeout } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';

export interface TournamentDto {
  id: number;
  name: string;
  sportId: number;
  registrationStartsAt: string;
  registrationEndsAt: string;
  startsAt: string;
}

export interface SaveTournamentRequest {
  name: string;
  sportId: number;
  registrationStartsAt: string;
  registrationEndsAt: string;
  startsAt: string;
}

export type UpdateTournamentRequest = Partial<SaveTournamentRequest>;

@Injectable({ providedIn: 'root' })
export class TournamentsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/tournaments`;

  findAll() { return this.http.get<TournamentDto[]>(this.url).pipe(timeout(15000)); }
  findOne(id: number) { return this.http.get<TournamentDto>(`${this.url}/${id}`).pipe(timeout(15000)); }
  create(body: SaveTournamentRequest) {
    return this.http.post<TournamentDto>(this.url, body).pipe(timeout(15000));
  }
  update(id: number, body: UpdateTournamentRequest) {
    return this.http.patch<TournamentDto>(`${this.url}/${id}`, body).pipe(timeout(15000));
  }
  remove(id: number) {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Actualiza el listado antes de repetir la operación.';
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
    switch (error.status) {
      case 0: return 'No se pudo conectar con Torneos. Comprueba que NestJS esté disponible y que CORS permita este origen.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes permiso para esta operación de torneos.';
      case 404: return 'No se encontró el torneo o el deporte seleccionado.';
      case 409: return 'No se puede eliminar el torneo porque tiene información asociada.';
      case 503: return 'No fue posible comprobar tus permisos con Seguridad. Inténtalo más tarde.';
      case 400: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' · ');
        return 'Revisa los campos y el orden de las fechas.';
      }
      default: return 'Ocurrió un error en el servidor. No se pudo confirmar la operación; actualiza el listado antes de reintentar.';
    }
  }
}

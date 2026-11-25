import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TimeoutError, timeout } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';

export interface SkillDto {
  id: number;
  name: string;
  description: string | null;
}

export interface SkillRequest {
  name: string;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class SkillsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/habilidades`;

  create(body: SkillRequest) {
    return this.http.post<SkillDto>(this.url, body).pipe(timeout(15000));
  }

  findAll() {
    return this.http.get<SkillDto[]>(this.url).pipe(timeout(15000));
  }

  update(id: number, body: SkillRequest) {
    return this.http.patch<SkillDto>(`${this.url}/${id}`, body).pipe(timeout(15000));
  }

  remove(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servidor tardó demasiado en responder. Comprueba el catálogo antes de repetir la operación.';
    }
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
    }
    const responseMessage: unknown = error.error?.message;
    const message = typeof responseMessage === 'string' && responseMessage.trim()
      ? responseMessage
      : null;
    switch (error.status) {
      case 0: return 'No se pudo conectar con el catálogo de habilidades. Comprueba que NestJS esté disponible.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 400: return message ?? 'Revisa el nombre y la descripción de la habilidad.';
      case 403: return 'No tienes permiso para gestionar el catálogo de habilidades.';
      case 404: return message ?? 'La habilidad ya no existe. Actualiza el catálogo.';
      case 409: return message ?? 'El nombre ya existe o la habilidad está asociada a jugadores.';
      case 503: return 'No fue posible comprobar tus permisos con Seguridad. Inténtalo más tarde.';
      default: return message ?? 'No se pudo completar la operación del catálogo de habilidades.';
    }
  }
}

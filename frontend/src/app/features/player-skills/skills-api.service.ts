import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TimeoutError, timeout } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';

export interface SkillDto {
  id: number;
  name: string;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class SkillsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/habilidades`;

  findAll() {
    return this.http.get<SkillDto[]>(this.url).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servidor tardó demasiado en responder. Actualiza el catálogo antes de repetir la operación.';
    }
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
    }
    switch (error.status) {
      case 0: return 'No se pudo conectar con el catálogo de habilidades. Comprueba que NestJS esté disponible.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes permiso para consultar las habilidades.';
      case 503: return 'No fue posible comprobar tus permisos con Seguridad. Inténtalo más tarde.';
      default: return 'No se pudo cargar el catálogo de habilidades.';
    }
  }
}

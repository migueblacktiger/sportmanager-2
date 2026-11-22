import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TimeoutError, timeout } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';

export interface TournamentRegistrationDto {
  id: number;
  tournamentId: number;
  tournamentName: string;
  sportId: number;
  teamId: number;
  teamName: string;
  teamActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class TournamentRegistrationsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = NEGOCIO_API_URL;

  register(tournamentId: number, teamIds: number[]) {
    return this.http.post<TournamentRegistrationDto[]>(
      `${this.url}/tournaments/${tournamentId}/registrations`,
      { teamIds },
    ).pipe(timeout(15000));
  }

  findByTournament(tournamentId: number) {
    return this.http.get<TournamentRegistrationDto[]>(
      `${this.url}/tournaments/${tournamentId}/registrations`,
    ).pipe(timeout(15000));
  }

  findByTeam(teamId: number) {
    return this.http.get<TournamentRegistrationDto[]>(
      `${this.url}/teams/${teamId}/registrations`,
    ).pipe(timeout(15000));
  }

  remove(tournamentId: number, teamId: number) {
    return this.http.delete<{ message: string }>(
      `${this.url}/tournaments/${tournamentId}/registrations/${teamId}`,
    ).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servidor tardó demasiado en responder. Actualiza la información antes de repetir la operación.';
    }
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servicio de inscripciones. Comprueba que NestJS esté disponible.';
      case 400: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' · ');
        return 'Selecciona uno o varios equipos válidos.';
      }
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes permiso para gestionar estas inscripciones.';
      case 404: return 'El torneo, el equipo o la inscripción ya no existe. Actualiza la información.';
      case 409: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        return 'La inscripción entra en conflicto con el período, el deporte o un registro existente.';
      }
      case 503: return 'No fue posible comprobar tus permisos con Seguridad. Inténtalo más tarde.';
      default: return 'No se pudo confirmar la operación. Actualiza la información antes de reintentar.';
    }
  }
}

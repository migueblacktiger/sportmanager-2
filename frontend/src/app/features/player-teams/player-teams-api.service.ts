import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout, TimeoutError } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';
import { PlayerDto } from '../players/players-api.service';
import { TeamDto } from '../teams/teams-api.service';

export type PlayerTeamStatus = 'programada' | 'vigente' | 'vencida' | 'finalizada';
export interface CreatePlayerTeamRequest {
  playerId: number;
  teamId: number;
  startDate: string;
  endDate: string;
}
export interface PlayerTeamDto extends CreatePlayerTeamRequest {
  id: number;
  finishedAt: string | null;
  status: PlayerTeamStatus;
  player: PlayerDto;
  team: TeamDto;
}

@Injectable({ providedIn: 'root' })
export class PlayerTeamsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/player-teams`;

  create(body: CreatePlayerTeamRequest) {
    return this.http.post<PlayerTeamDto>(this.url, body).pipe(timeout(15000));
  }
  findByTeam(teamId: number, status?: PlayerTeamStatus) {
    return this.http.get<PlayerTeamDto[]>(`${this.url}/teams/${teamId}`, status ? { params: { status } } : undefined).pipe(timeout(15000));
  }
  findByPlayer(playerId: number, status?: PlayerTeamStatus) {
    return this.http.get<PlayerTeamDto[]>(`${this.url}/players/${playerId}`, status ? { params: { status } } : undefined).pipe(timeout(15000));
  }
  finish(id: number) {
    return this.http.patch<PlayerTeamDto>(`${this.url}/${id}/finish`, {}).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) return 'El servidor tardó demasiado. Actualiza el historial antes de repetir la operación; podría haberse guardado.';
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la operación. Actualiza el historial antes de reintentar.';
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servicio de contratos. Comprueba la conexión y la disponibilidad de NestJS.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes permiso para realizar esta operación de contratos.';
      case 404: return 'El jugador, equipo o contrato ya no existe. Actualiza la información.';
      case 503: return 'No se pudieron comprobar tus permisos. Inténtalo más tarde.';
      case 400:
      case 409: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && message.length && message.every(item => typeof item === 'string')) return message.join(' · ');
        return error.status === 409
          ? 'El jugador ya tiene un contrato con este equipo en un periodo que se solapa. Revisa las fechas y el historial.'
          : 'Revisa el jugador y las fechas: son obligatorias y el fin no puede ser anterior al inicio.';
      }
      default: return 'No se pudo confirmar la operación. Actualiza el historial antes de volver a intentarlo.';
    }
  }
}

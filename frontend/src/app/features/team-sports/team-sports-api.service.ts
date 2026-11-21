import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { timeout, TimeoutError } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';
import { TeamDto } from '../teams/teams-api.service';
import { SportDto } from '../sports/sports-api.service';

export interface TeamSportDto {
  id: number;
  teamId: number;
  sportId: number;
  team: TeamDto;
  sport: SportDto;
}
export interface CreateTeamSportRequest { teamId: number; sportId: number; }

@Injectable({ providedIn: 'root' })
export class TeamSportsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/team-sports`;

  create(body: CreateTeamSportRequest) {
    return this.http.post<TeamSportDto>(this.url, body).pipe(timeout(15000));
  }
  findByTeam(teamId: number) {
    return this.http.get<TeamSportDto[]>(`${this.url}/teams/${teamId}`).pipe(timeout(15000));
  }
  findBySport(sportId: number) {
    return this.http.get<TeamSportDto[]>(`${this.url}/sports/${sportId}`).pipe(timeout(15000));
  }
  remove(teamId: number, sportId: number) {
    return this.http.delete<{ message: string }>(`${this.url}/${teamId}/${sportId}`).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) return 'El servidor tardó demasiado en responder. Actualiza las asociaciones antes de repetir la operación.';
    if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la operación. Inténtalo nuevamente.';
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servicio. Comprueba la conexión e inténtalo nuevamente.';
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes permiso para realizar esta operación de asociación entre equipos y deportes.';
      case 404: return 'El equipo, el deporte o la asociación ya no existe. Actualiza la información.';
      case 503: return 'No fue posible comprobar tus permisos. Inténtalo más tarde.';
      case 400:
      case 409: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' · ');
        return error.status === 409
          ? 'La asociación ya existe o tiene información vinculada que impide retirarla. Actualiza las asociaciones.'
          : 'Selecciona un equipo y un deporte válidos.';
      }
      default: return 'No se pudo confirmar la operación. Actualiza las asociaciones antes de reintentar.';
    }
  }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TimeoutError, timeout } from 'rxjs';
import { NEGOCIO_API_URL } from '../../negocio-api.config';
import { PlayerDto } from '../players/players-api.service';
import { SkillDto } from './skills-api.service';

export interface PlayerSkillDto {
  id: number;
  playerId: number;
  skillId: number;
  player: PlayerDto;
  skill: SkillDto;
}

export interface CreatePlayerSkillRequest {
  playerId: number;
  skillId: number;
}

@Injectable({ providedIn: 'root' })
export class PlayerSkillsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${NEGOCIO_API_URL}/player-skills`;

  create(body: CreatePlayerSkillRequest) {
    return this.http.post<PlayerSkillDto>(this.url, body).pipe(timeout(15000));
  }

  findByPlayer(playerId: number) {
    return this.http.get<PlayerSkillDto[]>(`${this.url}/players/${playerId}`).pipe(timeout(15000));
  }

  findBySkill(skillId: number) {
    return this.http.get<PlayerDto[]>(`${this.url}/skills/${skillId}`).pipe(timeout(15000));
  }

  remove(playerId: number, skillId: number) {
    return this.http.delete<{ message: string }>(
      `${this.url}/${playerId}/${skillId}`,
    ).pipe(timeout(15000));
  }

  errorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servidor tardó demasiado en responder. Actualiza las asociaciones antes de repetir la operación.';
    }
    if (!(error instanceof HttpErrorResponse)) {
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    }
    switch (error.status) {
      case 0: return 'No se pudo conectar con el servicio de habilidades de jugadores.';
      case 400: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        return 'Selecciona un jugador y una habilidad válidos.';
      }
      case 401: return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case 403: return 'No tienes permiso para esta operación de habilidades.';
      case 404: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        return 'El jugador, la habilidad o la asociación ya no existe. Actualiza la información.';
      }
      case 409: {
        const message: unknown = error.error?.message;
        if (typeof message === 'string' && message.trim()) return message;
        return 'La habilidad ya está asignada a este jugador.';
      }
      case 503: return 'No fue posible comprobar tus permisos con Seguridad. Inténtalo más tarde.';
      default: return 'No se pudo confirmar la operación. Actualiza las asociaciones antes de reintentar.';
    }
  }
}

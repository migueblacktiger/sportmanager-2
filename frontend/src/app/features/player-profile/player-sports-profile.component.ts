import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PlayerDto, PlayersApiService } from '../players/players-api.service';
import { PlayerSkillDto, PlayerSkillsApiService } from '../player-skills/player-skills-api.service';
import { PlayerTeamDto, PlayerTeamsApiService } from '../player-teams/player-teams-api.service';

@Component({
  selector: 'app-player-sports-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-sports-profile.component.html',
  styleUrl: './player-sports-profile.component.css',
})
export class PlayerSportsProfileComponent implements OnInit {
  private readonly playersApi = inject(PlayersApiService);
  private readonly playerSkillsApi = inject(PlayerSkillsApiService);
  private readonly playerTeamsApi = inject(PlayerTeamsApiService);
  private selectionGeneration = 0;
  private readonly finishFormatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  players: PlayerDto[] = [];
  selectedPlayerId: number | null = null;
  selectedPlayer: PlayerDto | null = null;
  skills: PlayerSkillDto[] = [];
  teams: PlayerTeamDto[] = [];
  catalogLoading = false;
  playerLoading = false;
  skillsLoading = false;
  teamsLoading = false;
  catalogLoaded = false;
  skillsLoaded = false;
  teamsLoaded = false;
  catalogError = '';
  playerError = '';
  skillsError = '';
  teamsError = '';

  ngOnInit(): void { void this.loadPlayers(); }

  get busy(): boolean { return this.catalogLoading; }

  trackPlayer(_index: number, player: PlayerDto): number { return player.id; }
  trackSkill(_index: number, association: PlayerSkillDto): number { return association.id; }
  trackTeam(_index: number, association: PlayerTeamDto): number { return association.id; }

  formatDate(value: string): string {
    return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  }

  formatFinishedAt(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : this.finishFormatter.format(date);
  }

  async loadPlayers(): Promise<void> {
    if (this.catalogLoading) return;
    this.catalogLoading = true;
    this.catalogError = '';
    try {
      this.players = await firstValueFrom(this.playersApi.findAll());
      this.catalogLoaded = true;
      if (this.selectedPlayerId !== null
          && !this.players.some(player => player.id === this.selectedPlayerId)) {
        this.selectedPlayerId = null;
        this.clearProfile();
      } else if (this.selectedPlayerId !== null) {
        await this.selectPlayer();
      }
    } catch (error: unknown) {
      this.catalogError = this.playersApi.errorMessage(error);
    } finally { this.catalogLoading = false; }
  }

  async selectPlayer(): Promise<void> {
    const generation = ++this.selectionGeneration;
    this.selectedPlayer = null;
    this.skills = [];
    this.teams = [];
    this.playerError = '';
    this.skillsError = '';
    this.teamsError = '';
    this.skillsLoaded = false;
    this.teamsLoaded = false;
    const playerId = this.selectedPlayerId;
    if (playerId === null) {
      this.playerLoading = false;
      this.skillsLoading = false;
      this.teamsLoading = false;
      return;
    }

    this.playerLoading = true;
    this.skillsLoading = true;
    this.teamsLoading = true;
    const playerRequest = firstValueFrom(this.playersApi.findOne(playerId))
      .then(player => {
        if (generation === this.selectionGeneration) this.selectedPlayer = player;
      })
      .catch((error: unknown) => {
        if (generation === this.selectionGeneration) {
          this.playerError = this.playersApi.errorMessage(error);
        }
      })
      .finally(() => {
        if (generation === this.selectionGeneration) this.playerLoading = false;
      });

    const skillsRequest = firstValueFrom(this.playerSkillsApi.findByPlayer(playerId))
      .then(skills => {
        if (generation === this.selectionGeneration) {
          this.skills = skills;
          this.skillsLoaded = true;
        }
      })
      .catch((error: unknown) => {
        if (generation === this.selectionGeneration) {
          this.skillsError = this.playerSkillsApi.errorMessage(error);
        }
      })
      .finally(() => {
        if (generation === this.selectionGeneration) this.skillsLoading = false;
      });

    const teamsRequest = this.requestTeams(playerId, generation);
    await Promise.all([playerRequest, skillsRequest, teamsRequest]);
  }

  retryTeams(): void {
    if (this.selectedPlayerId === null) return;
    this.teams = [];
    void this.requestTeams(this.selectedPlayerId, this.selectionGeneration);
  }

  private requestTeams(playerId: number, generation: number): Promise<void> {
    this.teamsLoading = true;
    this.teamsLoaded = false;
    this.teamsError = '';
    return firstValueFrom(this.playerTeamsApi.findByPlayer(playerId))
      .then(teams => {
        if (generation === this.selectionGeneration) {
          this.teams = teams;
          this.teamsLoaded = true;
        }
      })
      .catch((error: unknown) => {
        if (generation === this.selectionGeneration) {
          this.teamsError = this.playerTeamsApi.errorMessage(error);
        }
      })
      .finally(() => {
        if (generation === this.selectionGeneration) this.teamsLoading = false;
      });
  }

  private clearProfile(): void {
    this.selectionGeneration++;
    this.selectedPlayer = null;
    this.skills = [];
    this.teams = [];
    this.playerLoading = false;
    this.skillsLoading = false;
    this.teamsLoading = false;
    this.skillsLoaded = false;
    this.teamsLoaded = false;
    this.playerError = '';
    this.skillsError = '';
    this.teamsError = '';
  }
}

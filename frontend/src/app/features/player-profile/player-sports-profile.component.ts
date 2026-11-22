import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PlayerDto, PlayersApiService } from '../players/players-api.service';
import { PlayerSkillDto, PlayerSkillsApiService } from '../player-skills/player-skills-api.service';

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
  private selectionGeneration = 0;

  players: PlayerDto[] = [];
  selectedPlayerId: number | null = null;
  selectedPlayer: PlayerDto | null = null;
  skills: PlayerSkillDto[] = [];
  catalogLoading = false;
  playerLoading = false;
  skillsLoading = false;
  catalogLoaded = false;
  skillsLoaded = false;
  catalogError = '';
  playerError = '';
  skillsError = '';

  ngOnInit(): void { void this.loadPlayers(); }

  get busy(): boolean { return this.catalogLoading; }

  trackPlayer(_index: number, player: PlayerDto): number { return player.id; }
  trackSkill(_index: number, association: PlayerSkillDto): number { return association.id; }

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
    this.playerError = '';
    this.skillsError = '';
    this.skillsLoaded = false;
    const playerId = this.selectedPlayerId;
    if (playerId === null) {
      this.playerLoading = false;
      this.skillsLoading = false;
      return;
    }

    this.playerLoading = true;
    this.skillsLoading = true;
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

    await Promise.all([playerRequest, skillsRequest]);
  }

  private clearProfile(): void {
    this.selectionGeneration++;
    this.selectedPlayer = null;
    this.skills = [];
    this.playerLoading = false;
    this.skillsLoading = false;
    this.skillsLoaded = false;
    this.playerError = '';
    this.skillsError = '';
  }
}

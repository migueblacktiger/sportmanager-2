import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PlayerDto, PlayersApiService } from '../players/players-api.service';
import { PlayerSkillDto, PlayerSkillsApiService } from './player-skills-api.service';
import { SkillDto, SkillsApiService } from './skills-api.service';

@Component({
  selector: 'app-player-skills-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-skills-management.component.html',
  styleUrl: './player-skills-management.component.css',
})
export class PlayerSkillsManagementComponent implements OnInit {
  private readonly playersApi = inject(PlayersApiService);
  private readonly skillsApi = inject(SkillsApiService);
  private readonly associationsApi = inject(PlayerSkillsApiService);

  players: PlayerDto[] = [];
  skills: SkillDto[] = [];
  playerSkills: PlayerSkillDto[] = [];
  skillPlayers: PlayerDto[] = [];
  playerId: number | null = null;
  skillId: number | null = null;
  assignmentSkillId: number | null = null;
  loadingCatalog = false;
  loadingPlayerSkills = false;
  loadingSkillPlayers = false;
  assigning = false;
  removingPlayerSkillId: number | null = null;
  error = '';
  success = '';

  ngOnInit(): void { void this.loadCatalogs(); }

  get busy(): boolean {
    return this.loadingCatalog || this.loadingPlayerSkills || this.loadingSkillPlayers
      || this.assigning || this.removingPlayerSkillId !== null;
  }

  get selectedPlayer(): PlayerDto | undefined {
    return this.players.find(player => player.id === this.playerId);
  }

  get selectedSkill(): SkillDto | undefined {
    return this.skills.find(skill => skill.id === this.skillId);
  }

  get availableSkills(): SkillDto[] {
    const assigned = new Set(this.playerSkills.map(association => association.skillId));
    return this.skills.filter(skill => !assigned.has(skill.id));
  }

  trackPlayer(_index: number, player: PlayerDto): number { return player.id; }
  trackSkill(_index: number, skill: SkillDto): number { return skill.id; }
  trackAssociation(_index: number, association: PlayerSkillDto): number { return association.id; }

  async loadCatalogs(): Promise<void> {
    if (this.loadingCatalog) return;
    this.loadingCatalog = true;
    this.error = '';
    try {
      const result = await firstValueFrom(forkJoin({
        players: this.playersApi.findAll(),
        skills: this.skillsApi.findAll(),
      }));
      this.players = result.players;
      this.skills = result.skills;
      if (this.playerId && !this.players.some(player => player.id === this.playerId)) {
        this.playerId = null;
        this.assignmentSkillId = null;
        this.playerSkills = [];
      }
      if (this.skillId && !this.skills.some(skill => skill.id === this.skillId)) {
        this.skillId = null;
        this.skillPlayers = [];
      }
    } catch (error: unknown) {
      this.error = this.errorMessage(error);
    } finally { this.loadingCatalog = false; }
  }

  async selectPlayer(): Promise<void> {
    this.error = '';
    this.success = '';
    this.assignmentSkillId = null;
    this.playerSkills = [];
    if (this.playerId === null) return;
    this.loadingPlayerSkills = true;
    try {
      this.playerSkills = await firstValueFrom(
        this.associationsApi.findByPlayer(this.playerId),
      );
    } catch (error: unknown) {
      this.error = this.associationsApi.errorMessage(error);
    } finally { this.loadingPlayerSkills = false; }
  }

  async selectSkill(): Promise<void> {
    this.error = '';
    this.success = '';
    this.skillPlayers = [];
    if (this.skillId === null) return;
    this.loadingSkillPlayers = true;
    try {
      this.skillPlayers = await firstValueFrom(
        this.associationsApi.findBySkill(this.skillId),
      );
    } catch (error: unknown) {
      this.error = this.associationsApi.errorMessage(error);
    } finally { this.loadingSkillPlayers = false; }
  }

  async assignSkill(): Promise<void> {
    if (this.busy || this.playerId === null || this.assignmentSkillId === null) return;
    const playerId = this.playerId;
    const skillId = this.assignmentSkillId;
    this.assigning = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.associationsApi.create({ playerId, skillId }));
      this.assignmentSkillId = null;
      this.success = 'Habilidad asignada correctamente.';
      await this.refreshSelectedLists(playerId, skillId);
    } catch (error: unknown) {
      this.error = this.associationsApi.errorMessage(error);
    } finally { this.assigning = false; }
  }

  async removeAssociation(association: PlayerSkillDto): Promise<void> {
    if (this.busy) return;
    if (!window.confirm(
      `¿Retirar «${association.skill.name}» de «${association.player.name}»? `
      + 'No se eliminará el jugador ni la habilidad.',
    )) return;
    this.removingPlayerSkillId = association.id;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.associationsApi.remove(
        association.playerId,
        association.skillId,
      ));
      this.success = 'Asociación retirada correctamente.';
      await this.refreshSelectedLists(association.playerId, association.skillId);
    } catch (error: unknown) {
      this.error = this.associationsApi.errorMessage(error);
    } finally { this.removingPlayerSkillId = null; }
  }

  private async refreshSelectedLists(playerId: number, skillId: number): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    if (this.playerId === playerId) {
      this.loadingPlayerSkills = true;
      tasks.push(firstValueFrom(this.associationsApi.findByPlayer(playerId))
        .then(items => { this.playerSkills = items; })
        .catch((error: unknown) => { this.error = this.associationsApi.errorMessage(error); })
        .finally(() => { this.loadingPlayerSkills = false; }));
    }
    if (this.skillId === skillId) {
      this.loadingSkillPlayers = true;
      tasks.push(firstValueFrom(this.associationsApi.findBySkill(skillId))
        .then(items => { this.skillPlayers = items; })
        .catch((error: unknown) => { this.error = this.associationsApi.errorMessage(error); })
        .finally(() => { this.loadingSkillPlayers = false; }));
    }
    await Promise.all(tasks);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.url?.includes('/habilidades')) {
      return this.skillsApi.errorMessage(error);
    }
    return this.playersApi.errorMessage(error);
  }
}

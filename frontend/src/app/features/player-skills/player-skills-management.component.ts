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
  catalogOpen = false;
  skillSearch = '';
  selectedCatalogSkillId: number | null = null;
  skillFormOpen = false;
  editingSkillId: number | null = null;
  skillName = '';
  skillDescription = '';
  catalogError = '';
  catalogSuccess = '';
  savingSkill = false;
  removingSkillId: number | null = null;
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

  get catalogBusy(): boolean {
    return this.loadingCatalog || this.savingSkill || this.removingSkillId !== null;
  }

  get filteredSkills(): SkillDto[] {
    const query = this.skillSearch.trim().toLocaleLowerCase();
    if (!query) return this.skills;
    return this.skills.filter(skill =>
      `${skill.name} ${skill.description ?? ''}`.toLocaleLowerCase().includes(query),
    );
  }

  get selectedCatalogSkill(): SkillDto | undefined {
    return this.skills.find(skill => skill.id === this.selectedCatalogSkillId);
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
      if (this.catalogOpen && this.selectedCatalogSkillId === null && this.skills.length) {
        this.selectedCatalogSkillId = this.skills[0].id;
      }
      if (this.playerId && !this.players.some(player => player.id === this.playerId)) {
        this.playerId = null;
        this.assignmentSkillId = null;
        this.playerSkills = [];
      }
      if (this.selectedCatalogSkillId !== null
        && !this.skills.some(skill => skill.id === this.selectedCatalogSkillId)) {
        this.selectedCatalogSkillId = null;
      }
      if (this.skillId && !this.skills.some(skill => skill.id === this.skillId)) {
        this.skillId = null;
        this.skillPlayers = [];
      }
    } catch (error: unknown) {
      this.error = this.errorMessage(error);
      if (this.catalogOpen) this.catalogError = this.error;
    } finally { this.loadingCatalog = false; }
  }

  openSkillCatalog(): void {
    this.catalogOpen = true;
    this.skillSearch = '';
    this.catalogError = '';
    this.catalogSuccess = '';
    this.cancelSkillEdit();
    this.selectedCatalogSkillId = this.skills[0]?.id ?? null;
    void this.loadCatalogs();
  }

  closeSkillCatalog(): void {
    this.catalogOpen = false;
    this.cancelSkillEdit();
  }

  selectCatalogSkill(skill: SkillDto): void {
    this.selectedCatalogSkillId = skill.id;
    this.catalogError = '';
    this.catalogSuccess = '';
    this.cancelSkillEdit();
  }

  startNewSkill(): void {
    this.selectedCatalogSkillId = null;
    this.editingSkillId = null;
    this.skillName = '';
    this.skillDescription = '';
    this.skillFormOpen = true;
    this.catalogError = '';
    this.catalogSuccess = '';
  }

  editSkill(skill: SkillDto): void {
    this.selectedCatalogSkillId = skill.id;
    this.editingSkillId = skill.id;
    this.skillName = skill.name;
    this.skillDescription = skill.description ?? '';
    this.skillFormOpen = true;
    this.catalogError = '';
    this.catalogSuccess = '';
  }

  cancelSkillEdit(): void {
    this.skillFormOpen = false;
    this.editingSkillId = null;
    this.skillName = '';
    this.skillDescription = '';
  }

  async saveSkill(): Promise<void> {
    const name = this.skillName.trim();
    if (this.catalogBusy || !name) return;
    const request = {
      name,
      description: this.skillDescription.trim() || null,
    };
    const editingId = this.editingSkillId;
    this.savingSkill = true;
    this.catalogError = '';
    this.catalogSuccess = '';
    try {
      const saved = await firstValueFrom(
        editingId === null
          ? this.skillsApi.create(request)
          : this.skillsApi.update(editingId, request),
      );
      this.skills = this.skills.some(skill => skill.id === saved.id)
        ? this.skills.map(skill => skill.id === saved.id ? saved : skill)
        : [...this.skills, saved];
      this.playerSkills = this.playerSkills.map(association =>
        association.skillId === saved.id ? { ...association, skill: saved } : association,
      );
      this.selectedCatalogSkillId = saved.id;
      this.cancelSkillEdit();
      this.catalogSuccess = editingId === null
        ? 'Habilidad creada correctamente.'
        : 'Habilidad actualizada correctamente.';
    } catch (error: unknown) {
      this.catalogError = this.skillsApi.errorMessage(error);
    } finally { this.savingSkill = false; }
  }

  async deleteSkill(skill: SkillDto): Promise<void> {
    if (this.catalogBusy) return;
    if (!window.confirm(
      `¿Eliminar «${skill.name}»? Si está asociada a jugadores, el sistema impedirá eliminarla.`,
    )) return;
    this.removingSkillId = skill.id;
    this.catalogError = '';
    this.catalogSuccess = '';
    try {
      await firstValueFrom(this.skillsApi.remove(skill.id));
      this.skills = this.skills.filter(item => item.id !== skill.id);
      if (this.selectedCatalogSkillId === skill.id) this.selectedCatalogSkillId = null;
      if (this.skillId === skill.id) {
        this.skillId = null;
        this.skillPlayers = [];
      }
      this.catalogSuccess = 'Habilidad eliminada correctamente.';
    } catch (error: unknown) {
      this.catalogError = this.skillsApi.errorMessage(error);
    } finally { this.removingSkillId = null; }
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

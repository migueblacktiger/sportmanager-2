import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnChanges, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PlayerDto, PlayersApiService } from '../players/players-api.service';
import { TeamDto } from '../teams/teams-api.service';
import { PlayerTeamDto, PlayerTeamStatus, PlayerTeamsApiService } from './player-teams-api.service';

@Component({
  selector: 'app-player-teams', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './player-teams.component.html', styleUrl: './player-teams.component.css',
})
export class PlayerTeamsComponent implements OnChanges {
  private readonly api = inject(PlayerTeamsApiService);
  private readonly playersApi = inject(PlayersApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly finishFormatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short',
  });
  private generation = 0;
  private selection = '';
  private historyRequest?: Subscription;
  private catalogRequest?: Subscription;
  @ViewChild('contractForm') private formDirective?: NgForm;
  @Input() team: TeamDto | null = null;
  @Input() player: PlayerDto | null = null;
  @Input() contextBusy = false;

  contracts: PlayerTeamDto[] = [];
  players: PlayerDto[] = [];
  loading = false;
  loaded = false;
  catalogLoading = false;
  catalogLoaded = false;
  saving = false;
  historyError = '';
  catalogError = '';
  actionError = '';
  overlapError = '';
  message = '';
  statusFilter: 'all' | PlayerTeamStatus = 'all';
  form = { playerId: null as number | null, startDate: '', endDate: '' };

  get teamMode(): boolean { return !!this.team && !this.player; }
  get playerMode(): boolean { return !!this.player && !this.team; }
  get idPrefix(): string { return this.teamMode ? `contracts-team-${this.team!.id}` : this.playerMode ? `contracts-player-${this.player!.id}` : ''; }
  get busy(): boolean { return this.contextBusy || this.loading || this.catalogLoading || this.saving; }
  get filteredContracts(): PlayerTeamDto[] { return this.contracts.filter(row => this.statusFilter === 'all' || row.status === this.statusFilter); }
  get validDates(): boolean {
    return this.isCalendarDate(this.form.startDate) && this.isCalendarDate(this.form.endDate) && this.form.endDate >= this.form.startDate;
  }
  get canAssign(): boolean {
    return this.teamMode && !this.busy && this.loaded && this.catalogLoaded && this.validDates
      && this.players.some(player => player.id === this.form.playerId);
  }

  ngOnChanges(): void {
    const next = this.idPrefix;
    if (next === this.selection) return;
    this.selection = next;
    this.generation++;
    this.historyRequest?.unsubscribe(); this.catalogRequest?.unsubscribe();
    this.contracts = []; this.players = [];
    this.loading = this.loaded = this.catalogLoading = this.catalogLoaded = this.saving = false;
    this.historyError = this.catalogError = this.actionError = this.message = '';
    this.overlapError = '';
    this.statusFilter = 'all';
    this.form = { playerId: null, startDate: '', endDate: '' };
    this.formDirective?.resetForm(this.form);
    if (next) this.refresh();
  }

  refresh(): void {
    if (this.saving || (!this.teamMode && !this.playerMode)) return;
    this.loadHistory();
    if (this.teamMode) this.loadPlayers();
  }

  private loadHistory(): void {
    this.historyRequest?.unsubscribe();
    const generation = this.generation;
    this.loading = true; this.loaded = false; this.historyError = '';
    const request = this.teamMode ? this.api.findByTeam(this.team!.id) : this.api.findByPlayer(this.player!.id);
    this.historyRequest = request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: contracts => {
        if (generation !== this.generation) return;
        this.contracts = contracts; this.loading = false; this.loaded = true;
      },
      error: (error: unknown) => {
        if (generation !== this.generation) return;
        this.loading = false; this.historyError = this.api.errorMessage(error);
      },
    });
  }

  private loadPlayers(): void {
    this.catalogRequest?.unsubscribe();
    const generation = this.generation;
    this.catalogLoading = true; this.catalogLoaded = false; this.catalogError = '';
    this.catalogRequest = this.playersApi.findAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: players => {
        if (generation !== this.generation) return;
        this.players = players; this.catalogLoading = false; this.catalogLoaded = true;
        if (!players.some(player => player.id === this.form.playerId)) this.form.playerId = null;
      },
      error: (error: unknown) => {
        if (generation !== this.generation) return;
        this.catalogLoading = false; this.catalogError = this.playersApi.errorMessage(error);
      },
    });
  }

  assign(): void {
    if (!this.canAssign || !this.team || this.form.playerId === null) return;
    const generation = this.generation;
    const body = { teamId: this.team.id, playerId: this.form.playerId, startDate: this.form.startDate, endDate: this.form.endDate };
    this.saving = true; this.actionError = ''; this.message = '';
    this.overlapError = '';
    this.api.create(body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (generation !== this.generation) return;
        this.saving = false;
        this.form = { playerId: null, startDate: '', endDate: '' };
        this.formDirective?.resetForm(this.form);
        this.message = 'Contrato registrado correctamente. El historial se conserva.';
        this.refresh();
      },
      error: (error: unknown) => this.mutationError(error, generation, true),
    });
  }

  finish(contract: PlayerTeamDto): void {
    if (!this.teamMode || !this.team || this.busy || !this.loaded || contract.teamId !== this.team.id
        || !this.contracts.some(row => row.id === contract.id) || !this.canFinish(contract)) return;
    if (!window.confirm(`¿Finalizar el contrato #${contract.id} de «${contract.player.name}» con «${this.team.name}»? La retirada será inmediata y se conservarán el contrato y sus fechas originales en el historial.`)) return;
    const generation = this.generation;
    this.saving = true; this.actionError = ''; this.message = '';
    this.api.finish(contract.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        if (generation !== this.generation) return;
        this.saving = false;
        this.message = updated.status === 'vencida'
          ? 'El contrato ya había vencido. Su historial se conservó sin cambios.'
          : 'Asignación finalizada. El jugador, el equipo y el historial se conservaron.';
        this.refresh();
      },
      error: (error: unknown) => this.mutationError(error, generation),
    });
  }

  clearOverlapError(): void { this.overlapError = ''; }

  canFinish(contract: PlayerTeamDto): boolean { return contract.status === 'vigente' || contract.status === 'programada'; }
  trackContract(_index: number, contract: PlayerTeamDto): number { return contract.id; }
  trackPlayer(_index: number, player: PlayerDto): number { return player.id; }
  formatDate(value: string): string { return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`; }
  formatFinished(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : this.finishFormatter.format(date);
  }
  isCalendarDate(value: string): boolean {
    if (!/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  private mutationError(error: unknown, generation: number, isAssignment = false): void {
    if (generation !== this.generation) return;
    this.saving = false;
    if (isAssignment && error instanceof HttpErrorResponse && error.status === 409) {
      this.actionError = '';
      this.overlapError = 'Este jugador ya tiene una asignación con fechas que se superponen en este equipo. Selecciona otras fechas';
    } else {
      this.actionError = this.api.errorMessage(error);
    }
    if (error instanceof HttpErrorResponse && [404, 409].includes(error.status)) this.refresh();
  }
}

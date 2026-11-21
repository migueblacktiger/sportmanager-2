import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SportDto, SportsApiService } from '../sports/sports-api.service';
import { TeamDto } from '../teams/teams-api.service';
import { TeamSportDto, TeamSportsApiService } from './team-sports-api.service';

@Component({
  selector: 'app-team-sports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-sports.component.html',
  styleUrl: './team-sports.component.css',
})
export class TeamSportsComponent implements OnChanges {
  private readonly api = inject(TeamSportsApiService);
  private readonly sportsApi = inject(SportsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private generation = 0;
  private associationsRequest?: Subscription;
  private catalogRequest?: Subscription;

  @Input({ required: true }) team!: TeamDto;
  @Input() teamBusy = false;

  associations: TeamSportDto[] = [];
  sports: SportDto[] = [];
  selectedSportId: number | null = null;
  associationsLoading = false;
  catalogLoading = false;
  associationsLoaded = false;
  catalogLoaded = false;
  saving = false;
  associationsError = '';
  catalogError = '';
  actionError = '';
  message = '';

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['team'];
    if (!change || change.previousValue?.id === this.team.id) return;
    this.generation++;
    this.saving = false;
    this.associations = [];
    this.sports = [];
    this.selectedSportId = null;
    this.message = '';
    this.actionError = '';
    this.refresh();
  }

  get availableSports(): SportDto[] {
    if (!this.associationsLoaded || !this.catalogLoaded) return [];
    const assigned = new Set(this.associations.map(association => association.sportId));
    return this.sports.filter(sport => !assigned.has(sport.id));
  }
  get busy(): boolean { return this.teamBusy || this.saving || this.associationsLoading || this.catalogLoading; }
  get canAssociate(): boolean {
    return !this.busy && this.associationsLoaded && this.catalogLoaded
      && this.availableSports.some(sport => sport.id === this.selectedSportId);
  }
  trackAssociation(_index: number, association: TeamSportDto): number { return association.id; }
  trackSport(_index: number, sport: SportDto): number { return sport.id; }

  refresh(): void {
    if (this.saving) return;
    this.loadAssociations();
    this.loadCatalog();
  }

  private loadAssociations(): void {
    this.associationsRequest?.unsubscribe();
    const generation = this.generation;
    const teamId = this.team.id;
    this.associationsLoading = true;
    this.associationsLoaded = false;
    this.associationsError = '';
    this.associationsRequest = this.api.findByTeam(teamId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: associations => {
          if (generation !== this.generation) return;
          this.associations = associations;
          this.associationsLoaded = true;
          this.associationsLoading = false;
          if (this.associations.some(association => association.sportId === this.selectedSportId)) this.selectedSportId = null;
        },
        error: (error: unknown) => {
          if (generation !== this.generation) return;
          this.associationsLoading = false;
          this.associationsError = this.api.errorMessage(error);
        },
      });
  }

  private loadCatalog(): void {
    this.catalogRequest?.unsubscribe();
    const generation = this.generation;
    this.catalogLoading = true;
    this.catalogLoaded = false;
    this.catalogError = '';
    this.catalogRequest = this.sportsApi.findAll()
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: sports => {
          if (generation !== this.generation) return;
          this.sports = sports;
          this.catalogLoaded = true;
          this.catalogLoading = false;
          if (!sports.some(sport => sport.id === this.selectedSportId)) this.selectedSportId = null;
        },
        error: (error: unknown) => {
          if (generation !== this.generation) return;
          this.catalogLoading = false;
          this.catalogError = this.sportsApi.errorMessage(error);
        },
      });
  }

  associate(): void {
    if (!this.canAssociate || this.selectedSportId === null) return;
    const generation = this.generation;
    const body = { teamId: this.team.id, sportId: this.selectedSportId };
    this.saving = true;
    this.actionError = '';
    this.message = '';
    this.api.create(body).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (generation !== this.generation) return;
        this.saving = false;
        this.selectedSportId = null;
        this.message = 'Deporte asociado correctamente al equipo.';
        this.refresh();
      },
      error: (error: unknown) => this.handleMutationError(error, generation),
    });
  }

  removeAssociation(association: TeamSportDto): void {
    if (this.busy || !this.associationsLoaded || association.teamId !== this.team.id) return;
    if (!window.confirm(`¿Retirar «${association.sport.name}» de «${this.team.name}»? Solo se eliminará la asociación; el equipo y el deporte se conservarán.`)) return;
    const generation = this.generation;
    this.saving = true;
    this.actionError = '';
    this.message = '';
    this.api.remove(this.team.id, association.sportId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          if (generation !== this.generation) return;
          this.saving = false;
          this.message = 'Asociación retirada. El equipo y el deporte se conservaron.';
          this.refresh();
        },
        error: (error: unknown) => this.handleMutationError(error, generation),
      });
  }

  private handleMutationError(error: unknown, generation: number): void {
    if (generation !== this.generation) return;
    this.saving = false;
    this.actionError = this.api.errorMessage(error);
    // Refresh concurrent duplicates or records removed elsewhere using server data.
    if (error instanceof HttpErrorResponse && [404, 409].includes(error.status)) this.refresh();
  }
}

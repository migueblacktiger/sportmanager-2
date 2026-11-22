import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { TeamsApiService, TeamDto } from '../teams/teams-api.service';
import { TeamSportDto, TeamSportsApiService } from '../team-sports/team-sports-api.service';
import { TournamentDto, TournamentsApiService } from '../tournaments/tournaments-api.service';
import {
  TournamentRegistrationDto,
  TournamentRegistrationsApiService,
} from './tournament-registrations-api.service';

@Component({
  selector: 'app-tournament-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-registrations.component.html',
  styleUrl: './tournament-registrations.component.css',
})
export class TournamentRegistrationsComponent implements OnInit {
  private readonly api = inject(TournamentRegistrationsApiService);
  private readonly tournamentsApi = inject(TournamentsApiService);
  private readonly teamsApi = inject(TeamsApiService);
  private readonly teamSportsApi = inject(TeamSportsApiService);
  private tournamentGeneration = 0;
  private teamGeneration = 0;

  tournaments: TournamentDto[] = [];
  teams: TeamDto[] = [];
  tournamentRegistrations: TournamentRegistrationDto[] = [];
  teamRegistrations: TournamentRegistrationDto[] = [];
  sportAssociations: TeamSportDto[] = [];
  tournamentId: number | null = null;
  teamId: number | null = null;
  selectedTeamIds: number[] = [];
  loadingCatalog = false;
  loadingTournament = false;
  loadingTeam = false;
  saving = false;
  catalogLoaded = false;
  error = '';
  success = '';
  search = '';

  ngOnInit(): void { void this.loadCatalogs(); }

  get busy(): boolean {
    return this.loadingCatalog || this.loadingTournament || this.loadingTeam || this.saving;
  }

  get selectedTournament(): TournamentDto | undefined {
    return this.tournaments.find(tournament => tournament.id === this.tournamentId);
  }

  get selectedTeam(): TeamDto | undefined {
    return this.teams.find(team => team.id === this.teamId);
  }

  get registeredTeamIds(): Set<number> {
    return new Set(this.tournamentRegistrations.map(registration => registration.teamId));
  }

  get eligibleAssociations(): TeamSportDto[] {
    const registered = this.registeredTeamIds;
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.sportAssociations.filter(association =>
      !registered.has(association.teamId)
      && (!query || association.team.name.toLocaleLowerCase('es').includes(query)));
  }

  get registrationOpen(): boolean {
    const tournament = this.selectedTournament;
    if (!tournament) return false;
    const now = Date.now();
    return now >= Date.parse(tournament.registrationStartsAt)
      && now < Date.parse(tournament.registrationEndsAt)
      && now < Date.parse(tournament.startsAt);
  }

  get tournamentHasStarted(): boolean {
    return !!this.selectedTournament
      && Date.now() >= Date.parse(this.selectedTournament.startsAt);
  }

  get registrationState(): string {
    const tournament = this.selectedTournament;
    if (!tournament) return '';
    if (this.tournamentHasStarted) return 'El torneo ya inició';
    if (Date.now() < Date.parse(tournament.registrationStartsAt)) return 'Inscripciones aún no abiertas';
    if (Date.now() >= Date.parse(tournament.registrationEndsAt)) return 'Período de inscripción cerrado';
    return 'Inscripciones abiertas';
  }

  get matchingTournamentRegistrations(): TournamentRegistrationDto[] {
    return this.tournamentRegistrations.filter(registration =>
      this.eligibleTeamNameMatches(registration.teamName));
  }

  trackTournament(_index: number, tournament: TournamentDto): number { return tournament.id; }
  trackTeam(_index: number, team: TeamDto): number { return team.id; }
  trackAssociation(_index: number, association: TeamSportDto): number { return association.id; }
  trackRegistration(_index: number, registration: TournamentRegistrationDto): number {
    return registration.id;
  }

  async loadCatalogs(): Promise<void> {
    if (this.loadingCatalog) return;
    this.loadingCatalog = true;
    this.error = '';
    try {
      const result = await firstValueFrom(forkJoin({
        tournaments: this.tournamentsApi.findAll(),
        teams: this.teamsApi.findAll(),
      }));
      this.tournaments = result.tournaments;
      this.teams = result.teams;
      this.catalogLoaded = true;
      if (this.tournamentId && !this.tournaments.some(item => item.id === this.tournamentId)) {
        this.tournamentId = null;
        this.tournamentRegistrations = [];
        this.sportAssociations = [];
      }
      if (this.teamId && !this.teams.some(item => item.id === this.teamId)) {
        this.teamId = null;
        this.teamRegistrations = [];
      }
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
    } finally { this.loadingCatalog = false; }
  }

  async selectTournament(): Promise<void> {
    const generation = ++this.tournamentGeneration;
    this.success = '';
    this.error = '';
    this.selectedTeamIds = [];
    this.tournamentRegistrations = [];
    this.sportAssociations = [];
    const tournament = this.selectedTournament;
    if (!tournament) return;

    this.loadingTournament = true;
    try {
      const result = await firstValueFrom(forkJoin({
        registrations: this.api.findByTournament(tournament.id),
        associations: this.teamSportsApi.findBySport(tournament.sportId),
      }));
      if (generation !== this.tournamentGeneration) return;
      this.tournamentRegistrations = result.registrations;
      this.sportAssociations = result.associations;
    } catch (error: unknown) {
      if (generation === this.tournamentGeneration) this.error = this.api.errorMessage(error);
    } finally {
      if (generation === this.tournamentGeneration) this.loadingTournament = false;
    }
  }

  async selectTeam(): Promise<void> {
    const generation = ++this.teamGeneration;
    this.success = '';
    this.error = '';
    this.teamRegistrations = [];
    if (this.teamId === null) return;

    this.loadingTeam = true;
    try {
      const registrations = await firstValueFrom(this.api.findByTeam(this.teamId));
      if (generation === this.teamGeneration) this.teamRegistrations = registrations;
    } catch (error: unknown) {
      if (generation === this.teamGeneration) this.error = this.api.errorMessage(error);
    } finally {
      if (generation === this.teamGeneration) this.loadingTeam = false;
    }
  }

  toggleTeam(teamId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTeamIds = checked
      ? [...new Set([...this.selectedTeamIds, teamId])]
      : this.selectedTeamIds.filter(id => id !== teamId);
  }

  async registerSelected(): Promise<void> {
    const tournament = this.selectedTournament;
    if (this.busy || !tournament || !this.registrationOpen || !this.selectedTeamIds.length) return;
    const selected = [...this.selectedTeamIds];
    this.saving = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.api.register(tournament.id, selected));
      this.selectedTeamIds = [];
      const successMessage = selected.length === 1
        ? 'Equipo inscrito correctamente.'
        : `${selected.length} equipos inscritos correctamente.`;
      await this.selectTournament();
      this.success = successMessage;
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
    } finally { this.saving = false; }
  }

  async withdraw(registration: TournamentRegistrationDto): Promise<void> {
    if (this.busy || this.hasTournamentStarted(registration.tournamentId)) return;
    if (!window.confirm(`¿Retirar a «${registration.teamName}» de «${registration.tournamentName}»? El equipo y el torneo se conservarán.`)) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    try {
      await firstValueFrom(this.api.remove(registration.tournamentId, registration.teamId));
      const successMessage = `Se retiró a ${registration.teamName} del torneo.`;
      if (this.tournamentId === registration.tournamentId) await this.selectTournament();
      if (this.teamId === registration.teamId) await this.selectTeam();
      this.success = successMessage;
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
    } finally { this.saving = false; }
  }

  private eligibleTeamNameMatches(teamName: string): boolean {
    const query = this.search.trim().toLocaleLowerCase('es');
    return !query || teamName.toLocaleLowerCase('es').includes(query);
  }

  hasTournamentStarted(tournamentId: number): boolean {
    const tournament = this.tournaments.find(item => item.id === tournamentId);
    return !!tournament && Date.now() >= Date.parse(tournament.startsAt);
  }
}

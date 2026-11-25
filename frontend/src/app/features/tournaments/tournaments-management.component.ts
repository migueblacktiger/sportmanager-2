import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { SportDto, SportsApiService } from '../sports/sports-api.service';
import {
  SaveTournamentRequest,
  TournamentDto,
  TournamentsApiService,
  UpdateTournamentRequest,
} from './tournaments-api.service';

@Component({
  selector: 'app-tournaments-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournaments-management.component.html',
  styleUrl: './tournaments-management.component.css',
})
export class TournamentsManagementComponent implements OnInit {
  private readonly api = inject(TournamentsApiService);
  private readonly sportsApi = inject(SportsApiService);
  @ViewChild('editor', { static: true }) private editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('tournamentForm') private formDirective?: NgForm;

  tournaments: TournamentDto[] = [];
  sports: SportDto[] = [];
  selected: TournamentDto | null = null;
  editing: TournamentDto | null = null;
  loading = false;
  loaded = false;
  detailLoading = false;
  saving = false;
  error = '';
  formError = '';
  message = '';
  search = '';
  form = this.blankForm();

  ngOnInit(): void { void this.refresh(); }

  get busy(): boolean { return this.loading || this.detailLoading || this.saving; }

  get filteredTournaments(): TournamentDto[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.tournaments.filter(tournament =>
      `${tournament.name} ${this.sportName(tournament.sportId)}`
        .toLocaleLowerCase('es').includes(query));
  }

  get validationMessage(): string {
    if (!this.form.name.trim()) return 'Ingresa el nombre del torneo.';
    if ([...this.form.name].length > 180) return 'El nombre no puede superar 180 caracteres.';
    if (this.form.sportId === null || !Number.isInteger(this.form.sportId) || this.form.sportId < 1) {
      return 'Selecciona un deporte.';
    }

    const registrationStartsAt = this.parseLocalDateTime(this.form.registrationStartsAt);
    if (registrationStartsAt === null) return 'Completa la fecha y hora de inicio de inscripciones.';
    const registrationEndsAt = this.parseLocalDateTime(this.form.registrationEndsAt);
    if (registrationEndsAt === null) return 'Completa la fecha y hora de cierre de inscripciones.';
    const startsAt = this.parseLocalDateTime(this.form.startsAt);
    if (startsAt === null) return 'Completa la fecha y hora de inicio del torneo.';
    if (registrationStartsAt >= registrationEndsAt) {
      return 'El inicio de inscripciones debe ser anterior a su cierre.';
    }
    if (registrationEndsAt > startsAt) {
      return 'El cierre de inscripciones debe ser anterior o igual al inicio del torneo.';
    }
    return '';
  }

  get validFields(): boolean { return this.validationMessage === ''; }

  trackId(_index: number, tournament: TournamentDto): number { return tournament.id; }
  sportName(sportId: number): string {
    return this.sports.find(sport => sport.id === sportId)?.name ?? `Deporte #${sportId}`;
  }

  async refresh(): Promise<boolean> {
    if (this.loading) return false;
    this.loading = true;
    this.error = '';
    try {
      const result = await firstValueFrom(forkJoin({
        tournaments: this.api.findAll(),
        sports: this.sportsApi.findAll(),
      }));
      this.tournaments = result.tournaments;
      this.sports = result.sports;
      this.loaded = true;
      if (this.selected) {
        this.selected = this.tournaments.find(item => item.id === this.selected?.id) ?? null;
      }
      return true;
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
      return false;
    } finally { this.loading = false; }
  }

  async showDetail(tournament: TournamentDto, edit = false): Promise<void> {
    if (this.busy) return;
    this.detailLoading = true;
    this.error = '';
    try {
      this.selected = await firstValueFrom(this.api.findOne(tournament.id));
      if (edit) this.openEditor(this.selected);
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
    } finally { this.detailLoading = false; }
  }

  openNew(): void {
    if (this.busy || !this.loaded || !this.sports.length) return;
    this.editing = null;
    this.form = this.blankForm();
    this.showEditor();
  }

  private openEditor(tournament: TournamentDto): void {
    this.editing = tournament;
    this.form = {
      name: tournament.name,
      sportId: tournament.sportId,
      registrationStartsAt: this.toLocalInput(tournament.registrationStartsAt),
      registrationEndsAt: this.toLocalInput(tournament.registrationEndsAt),
      startsAt: this.toLocalInput(tournament.startsAt),
    };
    this.showEditor();
  }

  private showEditor(): void {
    this.formError = '';
    this.message = '';
    this.formDirective?.resetForm(this.form);
    this.editor.nativeElement.showModal();
  }

  closeEditor(): void { if (!this.saving) this.editor.nativeElement.close(); }
  cancelEditor(event: Event): void { if (this.saving) event.preventDefault(); }

  async save(): Promise<void> {
    if (this.saving) return;
    if (!this.validFields) {
      this.formError = this.validationMessage;
      return;
    }
    if (this.form.sportId === null) return;
    this.formError = '';
    this.saving = true;
    const body: SaveTournamentRequest = {
      name: this.form.name.trim(),
      sportId: this.form.sportId,
      registrationStartsAt: this.toUtc(this.form.registrationStartsAt),
      registrationEndsAt: this.toUtc(this.form.registrationEndsAt),
      startsAt: this.toUtc(this.form.startsAt),
    };
    try {
      if (this.editing) {
        const patch: UpdateTournamentRequest = {};
        if (body.name !== this.editing.name) patch.name = body.name;
        if (body.sportId !== this.editing.sportId) patch.sportId = body.sportId;
        if (!this.sameInstant(body.registrationStartsAt, this.editing.registrationStartsAt)) {
          patch.registrationStartsAt = body.registrationStartsAt;
        }
        if (!this.sameInstant(body.registrationEndsAt, this.editing.registrationEndsAt)) {
          patch.registrationEndsAt = body.registrationEndsAt;
        }
        if (!this.sameInstant(body.startsAt, this.editing.startsAt)) patch.startsAt = body.startsAt;
        if (!Object.keys(patch).length) { this.editor.nativeElement.close(); return; }
        this.selected = await firstValueFrom(this.api.update(this.editing.id, patch));
      } else {
        this.selected = await firstValueFrom(this.api.create(body));
      }
      this.editor.nativeElement.close();
      this.message = 'Torneo guardado correctamente.';
      await this.refresh();
    } catch (error: unknown) {
      this.formError = this.api.errorMessage(error);
    } finally { this.saving = false; }
  }

  async remove(tournament: TournamentDto): Promise<void> {
    if (this.busy || !window.confirm(`¿Eliminar «${tournament.name}»? Si tiene fases, partidos u otra información asociada, el servidor impedirá eliminarlo.`)) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      await firstValueFrom(this.api.remove(tournament.id));
      if (this.selected?.id === tournament.id) this.selected = null;
      this.message = 'Torneo eliminado correctamente.';
      await this.refresh();
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
    } finally { this.saving = false; }
  }

  private blankForm() {
    return {
      name: '',
      sportId: null as number | null,
      registrationStartsAt: '',
      registrationEndsAt: '',
      startsAt: '',
    };
  }

  private parseLocalDateTime(value: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private toLocalInput(utc: string): string {
    const date = new Date(utc);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      + `.${String(date.getMilliseconds()).padStart(3, '0')}`;
  }

  private toUtc(local: string): string { return new Date(local).toISOString(); }
  private sameInstant(left: string, right: string): boolean {
    return Date.parse(left) === Date.parse(right);
  }
}

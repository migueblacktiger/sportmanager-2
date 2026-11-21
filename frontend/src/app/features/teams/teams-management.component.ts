import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CreateTeamRequest, TeamDto, TeamsApiService, UpdateTeamRequest } from './teams-api.service';
import { TeamSportsComponent } from '../team-sports/team-sports.component';

@Component({
  selector: 'app-teams-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TeamSportsComponent],
  templateUrl: './teams-management.component.html',
  styleUrl: './teams-management.component.css',
})
export class TeamsManagementComponent implements OnInit {
  private readonly api = inject(TeamsApiService);
  @ViewChild('editor', { static: true }) private editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('teamForm') private formDirective?: NgForm;

  teams: TeamDto[] = [];
  selected: TeamDto | null = null;
  editing: TeamDto | null = null;
  loading = false;
  loaded = false;
  detailLoading = false;
  saving = false;
  error = '';
  formError = '';
  message = '';
  search = '';
  statusFilter = 'all';
  form = { name: '', description: '', active: true };

  ngOnInit(): void { void this.refresh(); }

  get activeTeamsCount(): number { return this.teams.filter(team => team.active).length; }

  get busy(): boolean { return this.loading || this.saving || this.detailLoading; }
  get filteredTeams(): TeamDto[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.teams.filter(team => (!query || team.name.toLocaleLowerCase('es').includes(query))
      && (this.statusFilter === 'all' || team.active === (this.statusFilter === 'active')));
  }
  get descriptionBytes(): number { return new TextEncoder().encode(this.form.description).length; }
  get validFields(): boolean {
    return !!this.form.name.trim() && [...this.form.name].length <= 180 && this.descriptionBytes <= 65535;
  }
  trackId(_index: number, team: TeamDto): number { return team.id; }

  async refresh(): Promise<boolean> {
    if (this.loading) return false;
    this.loading = true;
    this.error = '';
    try {
      this.teams = await firstValueFrom(this.api.findAll());
      this.loaded = true;
      if (this.selected) this.selected = this.teams.find(team => team.id === this.selected?.id) ?? null;
      return true;
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
      return false;
    } finally { this.loading = false; }
  }

  async showDetail(team: TeamDto, edit = false): Promise<void> {
    if (this.busy) return;
    this.detailLoading = true;
    this.error = '';
    try {
      this.selected = await firstValueFrom(this.api.findOne(team.id));
      if (edit) {
        this.editing = { ...this.selected };
        this.form = { name: this.selected.name, description: this.selected.description ?? '', active: this.selected.active };
        this.showEditor();
      }
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404 && this.selected?.id === team.id) this.selected = null;
      this.error = this.api.errorMessage(error);
    } finally { this.detailLoading = false; }
  }

  openNew(): void {
    if (this.busy || !this.loaded) return;
    this.editing = null;
    this.form = { name: '', description: '', active: true };
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
    if (this.saving || !this.validFields || this.formDirective?.invalid) return;
    this.formError = '';
    this.saving = true;
    const body: CreateTeamRequest = { name: this.form.name.trim(), description: this.form.description || null };
    try {
      if (this.editing) {
        const patch: UpdateTeamRequest = {};
        if (body.name !== this.editing.name) patch.name = body.name;
        if (body.description !== this.editing.description) patch.description = body.description;
        if (this.form.active !== this.editing.active) patch.active = this.form.active;
        if (!Object.keys(patch).length) { this.editor.nativeElement.close(); return; }
        this.selected = await firstValueFrom(this.api.update(this.editing.id, patch));
      } else this.selected = await firstValueFrom(this.api.create(body));
      this.editor.nativeElement.close();
      this.message = 'Equipo guardado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.formError = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  async toggleActive(team: TeamDto): Promise<void> {
    if (this.busy) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    try {
      const updated = await firstValueFrom(this.api.update(team.id, { active: !team.active }));
      if (this.selected?.id === updated.id) this.selected = updated;
      this.message = updated.active ? 'Equipo activado correctamente.' : 'Equipo desactivado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  async remove(team: TeamDto): Promise<void> {
    if (this.busy || !window.confirm(`¿Eliminar «${team.name}» (ID ${team.id})? Esta acción es permanente. Si existe información asociada, el servidor impedirá eliminarlo.`)) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      await firstValueFrom(this.api.remove(team.id));
      if (this.selected?.id === team.id) this.selected = null;
      this.message = 'Equipo eliminado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }
}

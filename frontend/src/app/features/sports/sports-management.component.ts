import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CreateSportRequest, SportDto, SportsApiService, UpdateSportRequest } from './sports-api.service';

@Component({
  selector: 'app-sports-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sports-management.component.html',
  styleUrl: './sports-management.component.css',
})
export class SportsManagementComponent implements OnInit {
  private readonly api = inject(SportsApiService);
  @ViewChild('editor', { static: true }) private editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('sportForm') private formDirective?: NgForm;

  sports: SportDto[] = [];
  selected: SportDto | null = null;
  editing: SportDto | null = null;
  loading = false;
  loaded = false;
  detailLoading = false;
  saving = false;
  error = '';
  formError = '';
  message = '';
  search = '';
  statusFilter = 'all';
  parentFilter: number | 'all' | 'roots' = 'all';
  form = { name: '', description: '', parentId: null as number | null, active: true };

  ngOnInit(): void { void this.refresh(); }

  get filteredSports(): SportDto[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.sports.filter(sport =>
      (!query || `${sport.name} ${sport.description ?? ''}`.toLocaleLowerCase('es').includes(query))
      && (this.statusFilter === 'all' || sport.active === (this.statusFilter === 'active'))
      && (this.parentFilter === 'all' || (this.parentFilter === 'roots' ? sport.parentId === null : sport.parentId === this.parentFilter)));
  }

  get children(): SportDto[] { return this.sports.filter(sport => sport.parentId === this.selected?.id); }

  get availableParents(): SportDto[] {
    return this.sports.filter(sport => (sport.active || sport.id === this.editing?.parentId)
      && !this.isDescendantOrSelf(sport));
  }

  get descriptionBytes(): number { return new TextEncoder().encode(this.form.description).length; }
  get validFields(): boolean {
    return !!this.form.name.trim() && [...this.form.name].length <= 180 && this.descriptionBytes <= 65535
      && (this.form.parentId === null || (Number.isInteger(this.form.parentId) && this.form.parentId > 0 && this.form.parentId <= 2147483647));
  }

  parentName(parentId: number | null): string {
    return parentId === null ? 'Deporte principal' : this.sports.find(sport => sport.id === parentId)?.name ?? `Deporte #${parentId}`;
  }
  childCount(id: number): number { return this.sports.filter(sport => sport.parentId === id).length; }
  trackId(_index: number, sport: SportDto): number { return sport.id; }

  async refresh(): Promise<boolean> {
    if (this.loading) return false;
    this.loading = true;
    this.error = '';
    try {
      this.sports = await firstValueFrom(this.api.findAll());
      this.loaded = true;
      if (this.selected) this.selected = this.sports.find(sport => sport.id === this.selected?.id) ?? null;
      return true;
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
      return false;
    } finally { this.loading = false; }
  }

  async showDetail(sport: SportDto, edit = false): Promise<void> {
    if (this.detailLoading || this.saving) return;
    this.detailLoading = true;
    this.error = '';
    try {
      this.selected = await firstValueFrom(this.api.findOne(sport.id));
      if (edit) this.openEditor(this.selected);
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.detailLoading = false; }
  }

  openNew(parentId: number | null = null): void {
    if (this.loading || this.saving || this.detailLoading) return;
    this.editing = null;
    this.form = { name: '', description: '', parentId, active: true };
    this.showEditor();
  }

  private openEditor(sport: SportDto): void {
    this.editing = { ...sport };
    this.form = { name: sport.name, description: sport.description ?? '', parentId: sport.parentId, active: sport.active };
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
    const body: CreateSportRequest = {
      name: this.form.name.trim(), description: this.form.description || null, parentId: this.form.parentId,
    };
    try {
      if (this.editing) {
        const patch: UpdateSportRequest = {};
        if (body.name !== this.editing.name) patch.name = body.name;
        if (body.description !== this.editing.description) patch.description = body.description;
        if (body.parentId !== this.editing.parentId) patch.parentId = body.parentId;
        if (this.form.active !== this.editing.active) patch.active = this.form.active;
        if (!Object.keys(patch).length) { this.editor.nativeElement.close(); return; }
        this.selected = await firstValueFrom(this.api.update(this.editing.id, patch));
      } else this.selected = await firstValueFrom(this.api.create(body));
      this.editor.nativeElement.close();
      this.message = 'Deporte guardado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.formError = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  async toggleActive(sport: SportDto): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    try {
      const updated = await firstValueFrom(this.api.update(sport.id, { active: !sport.active }));
      if (this.selected?.id === updated.id) this.selected = updated;
      this.message = updated.active ? 'Deporte activado.' : 'Deporte desactivado. Sus subdeportes conservan su estado.';
      await this.refresh();
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  async remove(sport: SportDto): Promise<void> {
    if (this.saving || !window.confirm(`¿Eliminar «${sport.name}»? Esta acción es permanente. Si tiene información asociada, el servidor impedirá eliminarlo.`)) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      await firstValueFrom(this.api.remove(sport.id));
      if (this.selected?.id === sport.id) this.selected = null;
      this.message = 'Deporte eliminado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  private isDescendantOrSelf(candidate: SportDto): boolean {
    if (!this.editing) return false;
    const visited = new Set<number>();
    let current: SportDto | undefined = candidate;
    while (current) {
      if (current.id === this.editing.id || visited.has(current.id)) return true;
      visited.add(current.id);
      current = current.parentId === null ? undefined : this.sports.find(sport => sport.id === current?.parentId);
    }
    return false;
  }
}

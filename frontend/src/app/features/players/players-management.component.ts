import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { PlayerTeamsComponent } from '../player-teams/player-teams.component';
import { firstValueFrom } from 'rxjs';
import { CreatePlayerRequest, PlayerDto, PlayersApiService, UpdatePlayerRequest } from './players-api.service';

@Component({
  selector: 'app-players-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PlayerTeamsComponent],
  templateUrl: './players-management.component.html',
  styleUrl: './players-management.component.css',
})
export class PlayersManagementComponent implements OnInit {
  private readonly api = inject(PlayersApiService);
  @ViewChild('editor', { static: true }) private editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('playerForm') private formDirective?: NgForm;
  @ViewChild('contractsSection', { read: ElementRef }) private contractsSection?: ElementRef<HTMLElement>;

  players: PlayerDto[] = [];
  selected: PlayerDto | null = null;
  editing: PlayerDto | null = null;
  loading = false;
  loaded = false;
  detailLoading = false;
  saving = false;
  error = '';
  formError = '';
  message = '';
  search = '';
  statusFilter = 'all';
  form = { name: '', identification: '', description: '', active: true };

  ngOnInit(): void { void this.refresh(); }

  get activePlayersCount(): number { return this.players.filter(player => player.active).length; }

  get busy(): boolean { return this.loading || this.saving || this.detailLoading; }
  get filteredPlayers(): PlayerDto[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.players.filter(player => (!query || player.name.toLocaleLowerCase('es').includes(query)
      || (player.identification ?? '').toLocaleLowerCase('es').includes(query))
      && (this.statusFilter === 'all' || player.active === (this.statusFilter === 'active')));
  }
  get descriptionBytes(): number { return new TextEncoder().encode(this.form.description).length; }
  get validFields(): boolean {
    return !!this.form.name.trim() && [...this.form.name].length <= 180
      && (!this.form.identification || !!this.form.identification.trim())
      && [...this.form.identification].length <= 80 && this.descriptionBytes <= 65535;
  }
  trackId(_index: number, player: PlayerDto): number { return player.id; }

  async refresh(): Promise<boolean> {
    if (this.loading) return false;
    this.loading = true;
    this.error = '';
    try {
      this.players = await firstValueFrom(this.api.findAll());
      this.loaded = true;
      if (this.selected) this.selected = this.players.find(player => player.id === this.selected?.id) ?? null;
      return true;
    } catch (error: unknown) {
      this.error = this.api.errorMessage(error);
      return false;
    } finally { this.loading = false; }
  }

  async showDetail(player: PlayerDto, edit = false): Promise<void> {
    if (this.busy) return;
    this.detailLoading = true;
    this.error = '';
    try {
      this.selected = await firstValueFrom(this.api.findOne(player.id));
      if (edit) {
        this.editing = { ...this.selected };
        this.form = { name: this.selected.name, identification: this.selected.identification ?? '', description: this.selected.description ?? '', active: this.selected.active };
        this.showEditor();
      }
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404 && this.selected?.id === player.id) this.selected = null;
      this.error = this.api.errorMessage(error);
    } finally { this.detailLoading = false; }
  }

  async showContracts(player: PlayerDto): Promise<void> {
    if (this.busy) return;
    await this.showDetail(player);
    if (this.error || this.selected?.id !== player.id) return;
    // Wait for Angular to render the conditional detail before moving focus.
    requestAnimationFrame(() => {
      const section = this.contractsSection?.nativeElement;
      if (this.selected?.id !== player.id || !section?.isConnected) return;
      section.scrollIntoView({ behavior: 'auto', block: 'start' });
      section.focus({ preventScroll: true });
    });
  }

  openNew(): void {
    if (this.busy || !this.loaded) return;
    this.editing = null;
    this.form = { name: '', identification: '', description: '', active: true };
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
    const body: CreatePlayerRequest = {
      name: this.form.name.trim(), identification: this.form.identification.trim() || null,
      description: this.form.description || null,
    };
    try {
      if (this.editing) {
        const patch: UpdatePlayerRequest = {};
        if (body.name !== this.editing.name) patch.name = body.name;
        if (body.identification !== this.editing.identification) patch.identification = body.identification;
        if (body.description !== this.editing.description) patch.description = body.description;
        if (this.form.active !== this.editing.active) patch.active = this.form.active;
        if (!Object.keys(patch).length) { this.editor.nativeElement.close(); return; }
        this.selected = await firstValueFrom(this.api.update(this.editing.id, patch));
      } else this.selected = await firstValueFrom(this.api.create(body));
      this.editor.nativeElement.close();
      this.message = 'Jugador guardado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.formError = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  async toggleActive(player: PlayerDto): Promise<void> {
    if (this.busy) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    try {
      const updated = await firstValueFrom(this.api.update(player.id, { active: !player.active }));
      if (this.selected?.id === updated.id) this.selected = updated;
      this.message = updated.active ? 'Jugador activado correctamente.' : 'Jugador desactivado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }

  async remove(player: PlayerDto): Promise<void> {
    if (this.busy || !window.confirm(`¿Eliminar «${player.name}» (ID ${player.id})? Esta acción es permanente. Si existe información asociada, el servidor impedirá eliminarlo.`)) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      await firstValueFrom(this.api.remove(player.id));
      if (this.selected?.id === player.id) this.selected = null;
      this.message = 'Jugador eliminado correctamente.';
      await this.refresh();
    } catch (error: unknown) { this.error = this.api.errorMessage(error); }
    finally { this.saving = false; }
  }
}

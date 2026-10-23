import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PermissionDto } from '../../../api.service';
import { permissionModelLabel, permissionOperationLabel } from './permission-display';

type AdministrativePage = 'users' | 'roles' | 'role-permissions';

@Component({
  selector: 'app-permission-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-management.component.html',
  styleUrl: './permission-management.component.css'
})
export class PermissionManagementComponent implements OnChanges {
  private api = inject(ApiService);

  @Input() permissions: PermissionDto[] = [];
  @Input() dataLoading = false;
  @Input() permissionsInUse = 0;
  @Output() catalogChanged = new EventEmitter<void>();
  @Output() navigationRequested = new EventEmitter<AdministrativePage>();
  @Output() notification = new EventEmitter<string>();

  search = '';
  selectedModel = '';
  selectedMethod = '';
  permModal = false;
  saving = false;
  formError = '';
  permForm = { id: null as number | null, url: '', method: 'GET', model: '' };
  readonly methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['permissions']) return;

    if (this.selectedModel && !this.models.includes(this.selectedModel)) {
      this.selectedModel = '';
    }
    if (this.selectedMethod && !this.httpMethods.includes(this.selectedMethod)) {
      this.selectedMethod = '';
    }
  }

  get models(): string[] {
    return [...new Set(this.permissions.map(permission => permission.model))]
      .sort((first, second) => first.localeCompare(second));
  }

  get httpMethods(): string[] {
    return [...new Set(this.permissions.map(permission => permission.method.toUpperCase()))]
      .sort((first, second) => first.localeCompare(second));
  }

  get filteredPermissions(): PermissionDto[] {
    const query = this.search.trim().toLowerCase();
    return this.permissions.filter(permission => {
      const matchesSearch = !query
        || (permission.model + ' ' + permission.url + ' ' + permission.method).toLowerCase().includes(query);
      const matchesModel = !this.selectedModel || permission.model === this.selectedModel;
      const matchesMethod = !this.selectedMethod || permission.method.toUpperCase() === this.selectedMethod;
      return matchesSearch && matchesModel && matchesMethod;
    });
  }

  get hasActiveFilters(): boolean {
    return !!this.search.trim() || !!this.selectedModel || !!this.selectedMethod;
  }

  clearFilters(): void {
    this.search = '';
    this.selectedModel = '';
    this.selectedMethod = '';
  }

  modelLabel(model: string): string {
    return permissionModelLabel(model);
  }

  operationOf(permission: PermissionDto): string {
    return permissionOperationLabel(permission);
  }

  openNewPermission(): void {
    this.permForm = { id: null, url: '', method: 'GET', model: '' };
    this.formError = '';
    this.permModal = true;
  }

  openEditPermission(permission: PermissionDto): void {
    this.permForm = {
      id: permission.id,
      url: permission.url,
      method: permission.method,
      model: permission.model
    };
    this.formError = '';
    this.permModal = true;
  }

  savePermission(): void {
    const form = this.permForm;
    this.formError = '';
    if (!form.url.trim() || !form.model.trim()) {
      this.formError = 'La URL y el modelo son obligatorios.';
      return;
    }

    const body = { url: form.url.trim(), method: form.method, model: form.model.trim() };
    this.saving = true;
    const request = form.id === null
      ? this.api.createPermission(body)
      : this.api.updatePermission(form.id, body);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.permModal = false;
        this.notification.emit('Permiso guardado correctamente.');
        this.catalogChanged.emit();
      },
      error: error => {
        this.saving = false;
        this.formError = this.api.errorMessage(error);
      }
    });
  }

  deletePermission(permission: PermissionDto): void {
    if (!confirm(`¿Eliminar el permiso ${permission.method} ${permission.url}?`)) return;

    this.api.deletePermission(permission.id).subscribe({
      next: () => {
        this.notification.emit('Permiso eliminado.');
        this.catalogChanged.emit();
      },
      error: error => this.notification.emit(this.api.errorMessage(error))
    });
  }
}

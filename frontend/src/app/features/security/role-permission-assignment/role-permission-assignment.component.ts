import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, PermissionDto, RoleDto, RolePermissionDto, UserRoleDto } from '../../../api.service';
import {
  PERMISSION_MODEL_LABELS,
  PERMISSION_OPERATIONS,
  permissionModelLabel,
  permissionOperationIndex
} from '../permission-management/permission-display';

type AdministrativePage = 'users' | 'roles' | 'permissions';

interface MatrixRow {
  model: string;
  label: string;
  icon: string;
  group: string;
  cells: number[][];
}

const MODEL_ICONS: Record<string, string> = {
  User: '♙',
  Profile: '☆',
  Role: '♧',
  Permission: '⚿',
  UserRole: '♧',
  RolePermission: '▦',
  Session: '⌂'
};

@Component({
  selector: 'app-role-permission-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-permission-assignment.component.html',
  styleUrl: './role-permission-assignment.component.css'
})
export class RolePermissionAssignmentComponent implements OnChanges {
  private api = inject(ApiService);

  @Input() roles: RoleDto[] = [];
  @Input() permissions: PermissionDto[] = [];
  @Input() userRoles: UserRoleDto[] = [];
  @Input() dataLoading = false;
  @Input() requestedRoleId: number | null = null;

  @Output() notification = new EventEmitter<string>();
  @Output() navigationRequested = new EventEmitter<AdministrativePage>();
  @Output() roleSelectionChanged = new EventEmitter<number | null>();
  @Output() rolePermissionsChanged = new EventEmitter<{ roleId: number; rolePermissions: RolePermissionDto[] }>();

  readonly operations = PERMISSION_OPERATIONS;
  selectedRoleId: number | null = null;
  matrixRows: MatrixRow[] = [];
  assigned = new Set<number>();
  savedAssigned = new Set<number>();
  matrixSaving = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['permissions']) {
      this.buildMatrix();
    }

    if (changes['roles'] || changes['requestedRoleId']) {
      const selectedRoleExists = this.roles.some(role => role.id === this.selectedRoleId);
      const requestedRoleExists = this.roles.some(role => role.id === this.requestedRoleId);
      const requestedRoleChanged = changes['requestedRoleId']
        && this.requestedRoleId !== this.selectedRoleId;
      const nextRoleId = requestedRoleExists && requestedRoleChanged
        ? this.requestedRoleId
        : selectedRoleExists
          ? this.selectedRoleId
          : this.roles[0]?.id ?? null;

      if (nextRoleId !== this.selectedRoleId || changes['roles']) {
        this.selectedRoleId = nextRoleId;
        if (nextRoleId !== null && !this.dataLoading) {
          this.loadRolePermissions(nextRoleId);
        } else if (nextRoleId === null) {
          this.assigned = new Set();
          this.savedAssigned = new Set();
        }
      }
    }
  }

  buildMatrix(): void {
    const byModel = new Map<string, MatrixRow>();
    for (const permission of this.permissions) {
      let row = byModel.get(permission.model);
      if (!row) {
        row = {
          model: permission.model,
          label: permissionModelLabel(permission.model),
          icon: MODEL_ICONS[permission.model] ?? '▦',
          group: PERMISSION_MODEL_LABELS[permission.model] ? 'Administración' : 'Otros módulos',
          cells: this.operations.map(() => [] as number[])
        };
        byModel.set(permission.model, row);
      }
      row.cells[permissionOperationIndex(permission)].push(permission.id);
    }
    this.matrixRows = [...byModel.values()];
  }

  get groups(): string[] {
    return [...new Set(this.matrixRows.map(row => row.group))];
  }

  get selectedRole(): RoleDto | undefined {
    return this.roles.find(role => role.id === this.selectedRoleId);
  }

  get assignedCount(): number {
    return this.assigned.size;
  }

  get allPermissions(): number {
    return this.permissions.length;
  }

  get modulesWithAccess(): number {
    return this.matrixRows.filter(row =>
      row.cells.some(ids => ids.some(id => this.assigned.has(id)))
    ).length;
  }

  get usersOfSelectedRole(): number {
    return this.selectedRoleId === null
      ? 0
      : this.userRoles.filter(userRole => userRole.role.id === this.selectedRoleId).length;
  }

  selectRole(roleId: number | null): void {
    this.selectedRoleId = roleId;
    this.roleSelectionChanged.emit(roleId);
    if (roleId !== null) {
      this.loadRolePermissions(roleId);
    } else {
      this.assigned = new Set();
      this.savedAssigned = new Set();
    }
  }

  loadRolePermissions(roleId: number, notify = false): void {
    this.api.getPermissionsOfRole(roleId).subscribe({
      next: rolePermissions => {
        if (this.selectedRoleId !== roleId) return;
        this.savedAssigned = new Set(rolePermissions.map(rolePermission => rolePermission.permission.id));
        this.assigned = new Set(this.savedAssigned);
        if (notify) {
          this.notification.emit(`Permisos de ${this.selectedRole?.name ?? 'el rol'} cargados desde el servidor.`);
        }
      },
      error: error => this.notification.emit(this.api.errorMessage(error))
    });
  }

  cellChecked(row: MatrixRow, index: number): boolean {
    const ids = row.cells[index];
    return ids.length > 0 && ids.every(id => this.assigned.has(id));
  }

  togglePermission(row: MatrixRow, index: number): void {
    const ids = row.cells[index];
    if (!ids.length) return;

    const next = new Set(this.assigned);
    if (this.cellChecked(row, index)) {
      ids.forEach(id => next.delete(id));
    } else {
      ids.forEach(id => next.add(id));
    }
    this.assigned = next;
  }

  reloadPermissions(): void {
    if (this.selectedRoleId !== null) {
      this.loadRolePermissions(this.selectedRoleId, true);
    }
  }

  savePermissions(): void {
    const role = this.selectedRole;
    if (!role) {
      this.notification.emit('Selecciona un rol.');
      return;
    }

    this.matrixSaving = true;
    this.api.replacePermissionsOfRole(role.id, [...this.assigned]).subscribe({
      next: rolePermissions => {
        this.matrixSaving = false;
        this.savedAssigned = new Set(rolePermissions.map(rolePermission => rolePermission.permission.id));
        this.assigned = new Set(this.savedAssigned);
        this.rolePermissionsChanged.emit({ roleId: role.id, rolePermissions });
        this.notification.emit(`Permisos de ${role.name} guardados correctamente.`);
      },
      error: error => {
        this.matrixSaving = false;
        this.notification.emit(this.api.errorMessage(error));
      }
    });
  }

  resetPermissions(): void {
    if (confirm('¿Restablecer la matriz de permisos a su último estado guardado?')) {
      this.assigned = new Set(this.savedAssigned);
      this.notification.emit('La matriz se ha restablecido.');
    }
  }
}

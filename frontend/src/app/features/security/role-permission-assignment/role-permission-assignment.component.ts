import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ApiService, PermissionDto, RoleDto, RolePermissionDto, UserRoleDto } from '../../../api.service';
import {
  PERMISSION_MODEL_LABELS,
  PERMISSION_OPERATIONS,
  permissionModelLabel,
  permissionOperationIndex
} from '../permission-management/permission-display';
import {
  countAssignedPermissions,
  permissionCellState,
  samePermissionIds,
  togglePermissionCell
} from './permission-cell-state';

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
  @ViewChild('roleSelector') private roleSelector?: NgModel;

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
  private permissionsRequestId = 0;

  get hasPendingChanges(): boolean {
    return !samePermissionIds(this.assigned, this.savedAssigned);
  }

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
    return countAssignedPermissions(this.assigned);
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
    if (this.matrixSaving) return;
    if (roleId === this.selectedRoleId) return;
    if (this.hasPendingChanges && !confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar de rol?')) {
      this.roleSelector?.control.setValue(this.selectedRoleId, { emitEvent: false });
      return;
    }

    this.selectedRoleId = roleId;
    this.roleSelectionChanged.emit(roleId);
    if (roleId !== null) {
      this.assigned = new Set();
      this.savedAssigned = new Set();
      this.loadRolePermissions(roleId);
    } else {
      this.permissionsRequestId++;
      this.assigned = new Set();
      this.savedAssigned = new Set();
    }
  }

  loadRolePermissions(roleId: number, notify = false): void {
    const requestId = ++this.permissionsRequestId;
    this.api.getPermissionsOfRole(roleId).subscribe({
      next: rolePermissions => {
        if (this.selectedRoleId !== roleId || requestId !== this.permissionsRequestId) return;
        this.savedAssigned = new Set(rolePermissions.map(rolePermission => rolePermission.permission.id));
        this.assigned = new Set(this.savedAssigned);
        if (notify) {
          this.notification.emit(`Permisos de ${this.selectedRole?.name ?? 'el rol'} cargados desde el servidor.`);
        }
      },
      error: error => {
        if (this.selectedRoleId === roleId && requestId === this.permissionsRequestId) {
          this.notification.emit(this.api.errorMessage(error));
        }
      }
    });
  }

  confirmAbandonPendingChanges(): boolean {
    if (!this.hasPendingChanges) return true;
    if (!confirm('Hay cambios sin guardar. ¿Descartarlos y salir de la asignación de permisos?')) {
      return false;
    }
    this.assigned = new Set(this.savedAssigned);
    return true;
  }

  cellChecked(row: MatrixRow, index: number): boolean {
    return permissionCellState(row.cells[index], this.assigned) === 'assigned';
  }

  cellIndeterminate(row: MatrixRow, index: number): boolean {
    return permissionCellState(row.cells[index], this.assigned) === 'partial';
  }

  cellState(row: MatrixRow, index: number): string {
    return permissionCellState(row.cells[index], this.assigned);
  }

  togglePermission(row: MatrixRow, index: number): void {
    const ids = row.cells[index];
    if (!ids.length) return;
    this.assigned = togglePermissionCell(ids, this.assigned);
  }

  reloadPermissions(): void {
    if (this.selectedRoleId !== null) {
      if (this.hasPendingChanges && !confirm('Hay cambios sin guardar. ¿Descartarlos y volver a cargar los permisos?')) {
        return;
      }
      this.assigned = new Set(this.savedAssigned);
      this.loadRolePermissions(this.selectedRoleId, true);
    }
  }

  savePermissions(): void {
    const role = this.selectedRole;
    if (!role) {
      this.notification.emit('Selecciona un rol.');
      return;
    }

    this.permissionsRequestId++;
    this.matrixSaving = true;
    this.api.replacePermissionsOfRole(role.id, [...this.assigned]).subscribe({
      next: rolePermissions => {
        this.matrixSaving = false;
        if (this.selectedRoleId === role.id) {
          this.savedAssigned = new Set(rolePermissions.map(rolePermission => rolePermission.permission.id));
          this.assigned = new Set(this.savedAssigned);
        }
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

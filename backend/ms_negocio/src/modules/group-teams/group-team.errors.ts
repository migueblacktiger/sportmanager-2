export class GroupTeamInputInvalidError extends Error {
  constructor(message = 'La solicitud de asignacion no es valida') {
    super(message);
    this.name = 'GroupTeamInputInvalidError';
  }
}

export class GroupTeamGroupNotFoundError extends Error {
  constructor(id: number) {
    super(`Grupo con id ${id} no encontrado`);
    this.name = 'GroupTeamGroupNotFoundError';
  }
}

export class GroupTeamPhaseTypeError extends Error {
  constructor(phaseId: number) {
    super(`No se pueden asignar equipos porque la fase ${phaseId} no es de tipo groups`);
    this.name = 'GroupTeamPhaseTypeError';
  }
}

export class GroupTeamTeamNotFoundError extends Error {
  constructor(id: number) {
    super(`Equipo con id ${id} no encontrado`);
    this.name = 'GroupTeamTeamNotFoundError';
  }
}

export class GroupTeamTeamInactiveError extends Error {
  constructor(id: number) {
    super(`El equipo ${id} esta inactivo y no puede participar en la competencia`);
    this.name = 'GroupTeamTeamInactiveError';
  }
}

export class GroupTeamNotFoundError extends Error {
  constructor(groupId: number, teamId: number) {
    super(`El equipo ${teamId} no esta asignado al grupo ${groupId}`);
    this.name = 'GroupTeamNotFoundError';
  }
}

export class GroupTeamTeamNotRegisteredError extends Error {
  constructor(teamId: number, tournamentId: number) {
    super(`El equipo ${teamId} no esta inscrito en el torneo ${tournamentId}`);
    this.name = 'GroupTeamTeamNotRegisteredError';
  }
}

export class GroupTeamDuplicateError extends Error {
  constructor(teamId?: number, groupId?: number) {
    super(teamId !== undefined && groupId !== undefined
      ? `El equipo ${teamId} ya esta asignado al grupo ${groupId}`
      : 'Uno o mas equipos ya estan asignados al grupo');
    this.name = 'GroupTeamDuplicateError';
  }
}

export class GroupTeamTeamInPhaseError extends Error {
  constructor(teamId?: number, otherGroupId?: number) {
    super(teamId !== undefined && otherGroupId !== undefined
      ? `El equipo ${teamId} ya esta asignado al grupo ${otherGroupId} de la misma fase`
      : 'Uno o mas equipos ya estan asignados a otro grupo de la misma fase');
    this.name = 'GroupTeamTeamInPhaseError';
  }
}

export class GroupTeamReferenceConflictError extends Error {
  constructor() {
    super('El grupo o un equipo cambio durante la asignacion; actualice los datos e intentelo nuevamente');
    this.name = 'GroupTeamReferenceConflictError';
  }
}

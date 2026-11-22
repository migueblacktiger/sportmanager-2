export class PlayerSkillInvalidIdError extends Error {
  constructor() {
    super('Los identificadores deben ser enteros positivos de hasta 2147483647');
    this.name = 'PlayerSkillInvalidIdError';
  }
}

export class PlayerSkillPlayerNotFoundError extends Error {
  constructor(id: number) {
    super(`Jugador con id ${id} no encontrado`);
    this.name = 'PlayerSkillPlayerNotFoundError';
  }
}

export class PlayerSkillSkillNotFoundError extends Error {
  constructor(id: number) {
    super(`Habilidad con id ${id} no encontrada`);
    this.name = 'PlayerSkillSkillNotFoundError';
  }
}

export class PlayerSkillReferenceNotFoundError extends Error {
  constructor() {
    super('El jugador o la habilidad ya no existe; actualice los datos e intentelo nuevamente');
    this.name = 'PlayerSkillReferenceNotFoundError';
  }
}

export class PlayerSkillAlreadyExistsError extends Error {
  constructor() {
    super('La habilidad ya esta asignada a este jugador');
    this.name = 'PlayerSkillAlreadyExistsError';
  }
}

export class PlayerSkillAssociationNotFoundError extends Error {
  constructor(playerId: number, skillId: number) {
    super(`La habilidad ${skillId} no esta asignada al jugador ${playerId}`);
    this.name = 'PlayerSkillAssociationNotFoundError';
  }
}

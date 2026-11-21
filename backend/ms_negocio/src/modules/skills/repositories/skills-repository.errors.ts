export class SkillUniqueConstraintError extends Error {
  constructor() {
    super('La restriccion de unicidad de habilidades fue incumplida');
    this.name = SkillUniqueConstraintError.name;
  }
}

export class SkillDeleteRestrictedError extends Error {
  constructor() {
    super('La base de datos impidio eliminar una habilidad referenciada');
    this.name = SkillDeleteRestrictedError.name;
  }
}

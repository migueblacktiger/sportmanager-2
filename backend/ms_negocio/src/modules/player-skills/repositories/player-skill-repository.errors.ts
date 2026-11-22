export class PlayerSkillUniqueConstraintError extends Error {
  constructor() {
    super('La restriccion de unicidad de la asociacion jugador-habilidad fue incumplida');
    this.name = 'PlayerSkillUniqueConstraintError';
  }
}

export class PlayerSkillForeignKeyError extends Error {
  constructor() {
    super('El jugador o la habilidad asociados ya no existen');
    this.name = 'PlayerSkillForeignKeyError';
  }
}

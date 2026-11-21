export class SkillNotFoundError extends Error {
  constructor(id: number) {
    super(`Habilidad con id ${id} no encontrada`);
    this.name = SkillNotFoundError.name;
  }
}

export class SkillAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe una habilidad con ese nombre');
    this.name = SkillAlreadyExistsError.name;
  }
}

export class SkillInUseError extends Error {
  constructor(id: number) {
    super(`No se puede eliminar la habilidad ${id} porque tiene asociaciones`);
    this.name = SkillInUseError.name;
  }
}

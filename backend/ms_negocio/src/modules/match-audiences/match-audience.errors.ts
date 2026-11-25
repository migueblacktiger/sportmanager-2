import { HttpStatus } from '@nestjs/common';

export abstract class MatchAudienceError extends Error {
  abstract readonly status: HttpStatus;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class MatchAudienceInputInvalidError extends MatchAudienceError {
  readonly status = HttpStatus.BAD_REQUEST;
  constructor() { super('El identificador debe ser un entero positivo de hasta 2147483647'); }
}

export class MatchAudienceMatchNotFoundError extends MatchAudienceError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(matchId: number) { super(`Partido con id ${matchId} no encontrado`); }
}

export class MatchAudienceRegistrationNotFoundError extends MatchAudienceError {
  readonly status = HttpStatus.NOT_FOUND;
  constructor(matchId: number, fanId: number, source: string) {
    super(`No existe la relacion de ${source} del aficionado ${fanId} con el partido ${matchId}`);
  }
}

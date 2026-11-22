import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import {
  PlayerSkillAlreadyExistsError,
  PlayerSkillAssociationNotFoundError,
  PlayerSkillInvalidIdError,
  PlayerSkillPlayerNotFoundError,
  PlayerSkillReferenceNotFoundError,
  PlayerSkillSkillNotFoundError,
} from './player-skill.errors';

type PlayerSkillError =
  | PlayerSkillAlreadyExistsError
  | PlayerSkillAssociationNotFoundError
  | PlayerSkillInvalidIdError
  | PlayerSkillPlayerNotFoundError
  | PlayerSkillReferenceNotFoundError
  | PlayerSkillSkillNotFoundError;

@Catch(
  PlayerSkillAlreadyExistsError,
  PlayerSkillAssociationNotFoundError,
  PlayerSkillInvalidIdError,
  PlayerSkillPlayerNotFoundError,
  PlayerSkillReferenceNotFoundError,
  PlayerSkillSkillNotFoundError,
)
export class PlayerSkillsHttpExceptionFilter implements ExceptionFilter {
  catch(exception: PlayerSkillError, host: ArgumentsHost): void {
    const status = exception instanceof PlayerSkillInvalidIdError
      ? HttpStatus.BAD_REQUEST
      : exception instanceof PlayerSkillPlayerNotFoundError
        || exception instanceof PlayerSkillSkillNotFoundError
        || exception instanceof PlayerSkillReferenceNotFoundError
        || exception instanceof PlayerSkillAssociationNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}

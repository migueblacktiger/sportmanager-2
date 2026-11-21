import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  SkillAlreadyExistsError,
  SkillInUseError,
  SkillNotFoundError,
} from './skills.errors';

@Catch(SkillNotFoundError, SkillAlreadyExistsError, SkillInUseError)
export class SkillsHttpExceptionFilter implements ExceptionFilter {
  catch(
    exception: SkillNotFoundError | SkillAlreadyExistsError | SkillInUseError,
    host: ArgumentsHost,
  ): void {
    const status = exception instanceof SkillNotFoundError
      ? HttpStatus.NOT_FOUND
      : HttpStatus.CONFLICT;
    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}

import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MatchAudienceError } from './match-audience.errors';

@Catch(MatchAudienceError)
export class MatchAudienceHttpExceptionFilter implements ExceptionFilter {
  catch(exception: MatchAudienceError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.status).json({ statusCode: exception.status, message: exception.message });
  }
}

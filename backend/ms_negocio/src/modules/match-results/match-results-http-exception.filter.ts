import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MatchResultsError } from './match-results.errors';

@Catch(MatchResultsError)
export class MatchResultsHttpExceptionFilter implements ExceptionFilter {
  catch(exception: MatchResultsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.status).json({ statusCode: exception.status, message: exception.message });
  }
}

import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MatchManagementError } from './match-management.errors';

@Catch(MatchManagementError)
export class MatchManagementHttpExceptionFilter implements ExceptionFilter {
  catch(exception: MatchManagementError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.status).json({ statusCode: exception.status, message: exception.message });
  }
}

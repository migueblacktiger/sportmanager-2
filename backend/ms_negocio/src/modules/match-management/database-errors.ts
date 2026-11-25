import { QueryFailedError } from 'typeorm';

export function hasDatabaseCode(error: unknown, ...codes: string[]): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return typeof driverError === 'object' && driverError !== null
    && 'code' in driverError && typeof driverError.code === 'string'
    && codes.includes(driverError.code);
}

export const REFERENCED_ROW_CODES = ['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED'];
export const MISSING_REFERENCE_CODES = ['ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW'];

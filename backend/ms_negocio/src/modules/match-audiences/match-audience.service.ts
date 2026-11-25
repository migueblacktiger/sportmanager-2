import { Injectable } from '@nestjs/common';
import { hasDatabaseCode, MISSING_REFERENCE_CODES } from '../match-management/database-errors';
import {
  MatchAudienceInputInvalidError,
  MatchAudienceMatchNotFoundError,
  MatchAudienceRegistrationNotFoundError,
} from './match-audience.errors';
import { MatchAudienceRepository } from './repositories/match-audience.repository';
import { MatchAudienceSource } from './match-audience-source';
import {
  MatchAudienceMemberDto, MatchAudienceRegistrationDto,
} from './dto/match-audience.dto';

const MAX_DATABASE_ID = 2147483647;

@Injectable()
export class MatchAudienceService {
  constructor(private readonly repository: MatchAudienceRepository) {}

  async register(
    matchId: number,
    fanId: number,
    source: MatchAudienceSource,
  ): Promise<MatchAudienceRegistrationDto> {
    this.validateId(matchId);
    this.validateId(fanId);
    await this.ensureMatch(matchId);
    try {
      await this.repository.add(matchId, fanId, source);
    } catch (error: unknown) {
      if (hasDatabaseCode(error, ...MISSING_REFERENCE_CODES)) {
        throw new MatchAudienceMatchNotFoundError(matchId);
      }
      throw error;
    }
    return { matchId, fanId, source };
  }

  async findBySource(matchId: number, source: MatchAudienceSource): Promise<MatchAudienceMemberDto[]> {
    this.validateId(matchId);
    await this.ensureMatch(matchId);
    return (await this.repository.findFanIds(matchId, source)).map(id => ({ id }));
  }

  async findAudience(matchId: number): Promise<MatchAudienceMemberDto[]> {
    this.validateId(matchId);
    await this.ensureMatch(matchId);
    return (await this.repository.findFanIds(matchId)).map(id => ({ id }));
  }

  async remove(matchId: number, fanId: number, source: MatchAudienceSource): Promise<{ message: string }> {
    this.validateId(matchId);
    this.validateId(fanId);
    await this.ensureMatch(matchId);
    if (!await this.repository.remove(matchId, fanId, source)) {
      throw new MatchAudienceRegistrationNotFoundError(matchId, fanId, source);
    }
    return { message: `Relacion de ${source} del aficionado ${fanId} eliminada del partido ${matchId}` };
  }

  private async ensureMatch(matchId: number): Promise<void> {
    if (!await this.repository.matchExists(matchId)) throw new MatchAudienceMatchNotFoundError(matchId);
  }

  private validateId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_DATABASE_ID) {
      throw new MatchAudienceInputInvalidError();
    }
  }
}

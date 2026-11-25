import { Injectable } from '@nestjs/common';
import type { OverviewQueryDto } from './dto/overview-query.dto';
import type { TournamentOverviewResponseDto } from './dto/tournament-overview-response.dto';
import { TournamentOverviewMapper } from './mappers/tournament-overview.mapper';
import { TournamentOverviewRepository } from './repositories/tournament-overview.repository';
import { TournamentOverviewNotFoundError } from './tournament-overview.errors';

@Injectable()
export class TournamentOverviewService {
  constructor(
    private readonly repository: TournamentOverviewRepository,
    private readonly mapper: TournamentOverviewMapper,
  ) {}

  async getOverview(tournamentId: number, query: OverviewQueryDto): Promise<TournamentOverviewResponseDto> {
    const includeAnnotations = query.includeAnnotations === true;
    const data = await this.repository.load(tournamentId, includeAnnotations);
    if (!data) throw new TournamentOverviewNotFoundError(tournamentId);
    return this.mapper.toOverviewDto(data, includeAnnotations);
  }
}

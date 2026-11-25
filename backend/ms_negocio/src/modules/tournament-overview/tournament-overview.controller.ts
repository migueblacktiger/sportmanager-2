import { Controller, Get, Param, ParseIntPipe, Query, UseFilters } from '@nestjs/common';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { TournamentOverviewResponseDto } from './dto/tournament-overview-response.dto';
import { TournamentOverviewHttpExceptionFilter } from './tournament-overview-http-exception.filter';
import { TournamentOverviewService } from './tournament-overview.service';

@Controller('tournaments/:tournamentId/overview')
@UseFilters(TournamentOverviewHttpExceptionFilter)
export class TournamentOverviewController {
  constructor(private readonly service: TournamentOverviewService) {}

  @Get()
  getOverview(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query() query: OverviewQueryDto,
  ): Promise<TournamentOverviewResponseDto> {
    return this.service.getOverview(tournamentId, query);
  }
}

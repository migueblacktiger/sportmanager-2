import { Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Post, UseFilters } from '@nestjs/common';
import { CreateMatchResultDto } from './dto/create-match-result.dto';
import { MatchResultResponseDto, MatchResultWithNotificationResponseDto } from './dto/match-result-response.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { MatchResultsHttpExceptionFilter } from './match-results-http-exception.filter';
import { MatchResultsService } from './match-results.service';

@Controller('tournaments/:tournamentId/matches/:matchId/result')
@UseFilters(MatchResultsHttpExceptionFilter)
export class MatchResultsController {
  constructor(private readonly service: MatchResultsService) {}

  @Post()
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: CreateMatchResultDto,
    @Headers('authorization') authorization?: string,
  ): Promise<MatchResultWithNotificationResponseDto> {
    return this.service.create(tournamentId, matchId, dto, authorization);
  }

  @Get()
  findOne(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<MatchResultResponseDto> {
    return this.service.findOne(tournamentId, matchId);
  }

  @Patch()
  update(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: UpdateMatchResultDto,
    @Headers('authorization') authorization?: string,
  ): Promise<MatchResultWithNotificationResponseDto> {
    return this.service.update(tournamentId, matchId, dto, authorization);
  }
}

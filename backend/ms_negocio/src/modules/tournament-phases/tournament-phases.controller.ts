import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseFilters } from '@nestjs/common';
import { CreateTournamentPhasesDto } from './dto/create-tournament-phases.dto';
import { TournamentPhaseResponseDto } from './dto/tournament-phase-response.dto';
import { UpdateTournamentPhaseDto } from './dto/update-tournament-phase.dto';
import { TournamentPhasesHttpExceptionFilter } from './tournament-phases-http-exception.filter';
import { TournamentPhasesService } from './tournament-phases.service';

@Controller()
@UseFilters(TournamentPhasesHttpExceptionFilter)
export class TournamentPhasesController {
  constructor(private readonly service: TournamentPhasesService) {}

  @Post('tournaments/:tournamentId/phases')
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Body() dto: CreateTournamentPhasesDto,
  ): Promise<TournamentPhaseResponseDto[]> {
    return this.service.create(tournamentId, dto);
  }

  @Get('tournaments/:tournamentId/phases')
  findByTournament(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ): Promise<TournamentPhaseResponseDto[]> {
    return this.service.findByTournament(tournamentId);
  }

  @Get('phases/:id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TournamentPhaseResponseDto> {
    return this.service.findOne(id);
  }

  @Patch('phases/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTournamentPhaseDto,
  ): Promise<TournamentPhaseResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete('phases/:id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.service.remove(id);
  }
}

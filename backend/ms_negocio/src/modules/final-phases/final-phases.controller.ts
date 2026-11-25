import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseFilters } from '@nestjs/common';
import { MatchResponseDto } from '../matches/dto/match-response.dto';
import { CreateFinalPhaseDto } from './dto/create-final-phase.dto';
import { FinalPhaseResponseDto } from './dto/final-phase-response.dto';
import { UpdateFinalPhaseDto } from './dto/update-final-phase.dto';
import { FinalPhasesHttpExceptionFilter } from './final-phases-http-exception.filter';
import { FinalPhasesService } from './final-phases.service';

@Controller('tournaments/:tournamentId/final-phases')
@UseFilters(FinalPhasesHttpExceptionFilter)
export class FinalPhasesController {
  constructor(private readonly service: FinalPhasesService) {}

  @Post()
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Body() dto: CreateFinalPhaseDto,
  ): Promise<FinalPhaseResponseDto> {
    return this.service.create(tournamentId, dto);
  }

  @Get()
  findByTournament(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ): Promise<FinalPhaseResponseDto[]> {
    return this.service.findByTournament(tournamentId);
  }

  @Get(':id')
  findOne(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FinalPhaseResponseDto> {
    return this.service.findOne(tournamentId, id);
  }

  @Get(':id/matches')
  findMatches(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchResponseDto[]> {
    return this.service.findMatches(tournamentId, id);
  }

  @Patch(':id')
  update(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFinalPhaseDto,
  ): Promise<FinalPhaseResponseDto> {
    return this.service.update(tournamentId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.service.remove(tournamentId, id);
  }
}

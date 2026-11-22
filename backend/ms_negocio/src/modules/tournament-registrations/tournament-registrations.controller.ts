import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseFilters } from '@nestjs/common';
import { CreateTournamentRegistrationsDto } from './dto/create-tournament-registrations.dto';
import { TournamentRegistrationResponseDto } from './dto/tournament-registration-response.dto';
import { TournamentRegistrationsHttpExceptionFilter } from './tournament-registrations-http-exception.filter';
import { TournamentRegistrationsService } from './tournament-registrations.service';

@Controller()
@UseFilters(TournamentRegistrationsHttpExceptionFilter)
export class TournamentRegistrationsController {
  constructor(private readonly service: TournamentRegistrationsService) {}

  @Post('tournaments/:tournamentId/registrations')
  register(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Body() dto: CreateTournamentRegistrationsDto,
  ): Promise<TournamentRegistrationResponseDto[]> {
    return this.service.register(tournamentId, dto);
  }

  @Get('tournaments/:tournamentId/registrations')
  findByTournament(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ): Promise<TournamentRegistrationResponseDto[]> {
    return this.service.findByTournament(tournamentId);
  }

  @Get('teams/:teamId/registrations')
  findByTeam(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<TournamentRegistrationResponseDto[]> {
    return this.service.findByTeam(teamId);
  }

  @Delete('tournaments/:tournamentId/registrations/:teamId')
  remove(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(tournamentId, teamId);
  }
}

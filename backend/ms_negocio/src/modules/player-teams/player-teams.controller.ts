import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreatePlayerTeamDto } from './dto/create-player-team.dto';
import { PlayerTeamQueryDto } from './dto/player-team-query.dto';
import { PlayerTeamResponseDto } from './dto/player-team-response.dto';
import { PlayerTeamsService } from './player-teams.service';

@Controller('player-teams')
export class PlayerTeamsController {
  constructor(private readonly service: PlayerTeamsService) {}

  @Post()
  create(@Body() dto: CreatePlayerTeamDto): Promise<PlayerTeamResponseDto> { return this.service.create(dto); }

  @Get('teams/:teamId')
  findByTeam(@Param('teamId', ParseIntPipe) teamId: number, @Query() query: PlayerTeamQueryDto): Promise<PlayerTeamResponseDto[]> {
    return this.service.findByTeam(teamId, query.status);
  }

  @Get('players/:playerId')
  findByPlayer(@Param('playerId', ParseIntPipe) playerId: number, @Query() query: PlayerTeamQueryDto): Promise<PlayerTeamResponseDto[]> {
    return this.service.findByPlayer(playerId, query.status);
  }

  @Patch(':id/finish')
  finish(@Param('id', ParseIntPipe) id: number): Promise<PlayerTeamResponseDto> { return this.service.finish(id); }
}

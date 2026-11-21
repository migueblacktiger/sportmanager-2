import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateTeamSportDto } from './dto/create-team-sport.dto';
import { TeamSportResponseDto } from './dto/team-sport-response.dto';
import { TeamSportsService } from './team-sports.service';

@Controller('team-sports')
export class TeamSportsController {
  constructor(private readonly teamSportsService: TeamSportsService) {}

  @Post()
  create(@Body() dto: CreateTeamSportDto): Promise<TeamSportResponseDto> {
    return this.teamSportsService.create(dto);
  }

  @Get('teams/:teamId')
  findByTeam(@Param('teamId', ParseIntPipe) teamId: number): Promise<TeamSportResponseDto[]> {
    return this.teamSportsService.findByTeam(teamId);
  }

  @Get('sports/:sportId')
  findBySport(@Param('sportId', ParseIntPipe) sportId: number): Promise<TeamSportResponseDto[]> {
    return this.teamSportsService.findBySport(sportId);
  }

  @Delete(':teamId/:sportId')
  remove(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('sportId', ParseIntPipe) sportId: number,
  ): Promise<{ message: string }> {
    return this.teamSportsService.remove(teamId, sportId);
  }
}

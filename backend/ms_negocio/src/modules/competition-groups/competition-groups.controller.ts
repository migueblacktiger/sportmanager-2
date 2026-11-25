import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseFilters } from '@nestjs/common';
import { CompetitionGroupsHttpExceptionFilter } from './competition-groups-http-exception.filter';
import { CompetitionGroupsService } from './competition-groups.service';
import { CompetitionGroupResponseDto } from './dto/competition-group-response.dto';
import { CreateCompetitionGroupsDto } from './dto/create-competition-groups.dto';
import { UpdateCompetitionGroupDto } from './dto/update-competition-group.dto';

@Controller()
@UseFilters(CompetitionGroupsHttpExceptionFilter)
export class CompetitionGroupsController {
  constructor(private readonly service: CompetitionGroupsService) {}

  @Post('tournaments/:tournamentId/phases/:phaseId/groups')
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() dto: CreateCompetitionGroupsDto,
  ): Promise<CompetitionGroupResponseDto[]> {
    return this.service.create(tournamentId, phaseId, dto);
  }

  @Get('tournaments/:tournamentId/phases/:phaseId/groups')
  findByPhase(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
  ): Promise<CompetitionGroupResponseDto[]> {
    return this.service.findByPhase(tournamentId, phaseId);
  }

  @Get('groups/:id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CompetitionGroupResponseDto> {
    return this.service.findOne(id);
  }

  @Patch('groups/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompetitionGroupDto,
  ): Promise<CompetitionGroupResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete('groups/:id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.service.remove(id);
  }
}

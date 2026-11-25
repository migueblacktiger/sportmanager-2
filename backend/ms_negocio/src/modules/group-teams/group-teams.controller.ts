import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseFilters } from '@nestjs/common';
import { CreateGroupTeamsDto } from './dto/create-group-teams.dto';
import { GroupTeamResponseDto } from './dto/group-team-response.dto';
import { GroupTeamsHttpExceptionFilter } from './group-teams-http-exception.filter';
import { GroupTeamsService } from './group-teams.service';

@Controller()
@UseFilters(GroupTeamsHttpExceptionFilter)
export class GroupTeamsController {
  constructor(private readonly service: GroupTeamsService) {}

  @Post('groups/:groupId/teams')
  assign(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateGroupTeamsDto,
  ): Promise<GroupTeamResponseDto[]> {
    return this.service.assign(groupId, dto);
  }

  @Get('groups/:groupId/teams')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number): Promise<GroupTeamResponseDto[]> {
    return this.service.findByGroup(groupId);
  }

  @Delete('groups/:groupId/teams/:teamId')
  remove(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<{ message: string }> {
    return this.service.remove(groupId, teamId);
  }
}

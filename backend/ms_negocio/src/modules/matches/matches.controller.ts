import {
  Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, UseFilters,
} from '@nestjs/common';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { MatchesHttpExceptionFilter } from './matches-http-exception.filter';
import { MatchesService } from './matches.service';
import { MatchManagementHttpExceptionFilter } from '../match-management/match-management-http-exception.filter';

@Controller()
@UseFilters(MatchesHttpExceptionFilter, MatchManagementHttpExceptionFilter)
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Post('phases/:phaseId/matches')
  create(
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() dto: CreateMatchDto,
    @Headers('authorization') authorization?: string,
  ): Promise<MatchResponseDto> {
    return this.service.create(phaseId, dto, authorization);
  }

  @Get('phases/:phaseId/matches')
  findByPhase(@Param('phaseId', ParseIntPipe) phaseId: number): Promise<MatchResponseDto[]> {
    return this.service.findByPhase(phaseId);
  }

  @Get('matches/:id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<MatchResponseDto> {
    return this.service.findOne(id);
  }

  @Delete('matches/:id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.service.remove(id);
  }
}

import {
  Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Patch, Post, Query, UseFilters,
} from '@nestjs/common';
import { CreateManagedMatchDto } from './dto/create-managed-match.dto';
import { CreatedManagedMatchResponseDto, ManagedMatchResponseDto } from './dto/managed-match-response.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { UpdateManagedMatchDto } from './dto/update-managed-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { MatchManagementHttpExceptionFilter } from './match-management-http-exception.filter';
import { MatchManagementService } from './match-management.service';

@Controller('tournaments/:tournamentId')
@UseFilters(MatchManagementHttpExceptionFilter)
export class MatchManagementController {
  constructor(private readonly service: MatchManagementService) {}

  @Post('phases/:phaseId/matches')
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
    @Body() dto: CreateManagedMatchDto,
    @Headers('authorization') authorization?: string,
  ): Promise<CreatedManagedMatchResponseDto> {
    return this.service.create(tournamentId, phaseId, dto, authorization);
  }

  @Get('phases/:phaseId/matches')
  findByPhase(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('phaseId', ParseIntPipe) phaseId: number,
  ): Promise<ManagedMatchResponseDto[]> {
    return this.service.findByPhase(tournamentId, phaseId);
  }

  @Get('matches')
  findAll(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Query() query: MatchQueryDto,
  ): Promise<ManagedMatchResponseDto[]> {
    return this.service.findAll(tournamentId, query);
  }

  @Get('matches/:id')
  findOne(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ManagedMatchResponseDto> {
    return this.service.findOne(tournamentId, id);
  }

  @Patch('matches/:id')
  update(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateManagedMatchDto,
  ): Promise<ManagedMatchResponseDto> {
    return this.service.update(tournamentId, id, dto);
  }

  @Patch('matches/:id/status')
  updateStatus(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMatchStatusDto,
    @Headers('authorization') authorization?: string,
  ): Promise<ManagedMatchResponseDto> {
    return this.service.updateStatus(tournamentId, id, dto, authorization);
  }

  @Delete('matches/:id')
  remove(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.service.remove(tournamentId, id);
  }
}

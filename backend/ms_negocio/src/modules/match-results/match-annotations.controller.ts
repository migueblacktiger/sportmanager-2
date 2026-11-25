import {
  Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Patch, Post, UseFilters,
} from '@nestjs/common';
import { CreateMatchAnnotationDto } from './dto/create-match-annotation.dto';
import {
  CreatedMatchAnnotationResponseDto, MatchAnnotationResponseDto,
} from './dto/match-annotation-response.dto';
import { UpdateMatchAnnotationDto } from './dto/update-match-annotation.dto';
import { MatchAnnotationsService } from './match-annotations.service';
import { MatchResultsHttpExceptionFilter } from './match-results-http-exception.filter';

@Controller('tournaments/:tournamentId/matches/:matchId/annotations')
@UseFilters(MatchResultsHttpExceptionFilter)
export class MatchAnnotationsController {
  constructor(private readonly service: MatchAnnotationsService) {}

  @Post()
  create(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: CreateMatchAnnotationDto,
    @Headers('authorization') authorization?: string,
  ): Promise<CreatedMatchAnnotationResponseDto> {
    return this.service.create(tournamentId, matchId, dto, authorization);
  }

  @Get()
  findAll(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
  ): Promise<MatchAnnotationResponseDto[]> {
    return this.service.findAll(tournamentId, matchId);
  }

  @Get(':id')
  findOne(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MatchAnnotationResponseDto> {
    return this.service.findOne(tournamentId, matchId, id);
  }

  @Patch(':id')
  update(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMatchAnnotationDto,
  ): Promise<MatchAnnotationResponseDto> {
    return this.service.update(tournamentId, matchId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.service.remove(tournamentId, matchId, id);
  }
}

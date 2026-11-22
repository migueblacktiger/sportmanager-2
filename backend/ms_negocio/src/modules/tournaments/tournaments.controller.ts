import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseFilters,
} from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentResponseDto } from './dto/tournament-response.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentsHttpExceptionFilter } from './tournaments-http-exception.filter';
import { TournamentsService } from './tournaments.service';

@Controller('tournaments')
@UseFilters(TournamentsHttpExceptionFilter)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  create(@Body() dto: CreateTournamentDto): Promise<TournamentResponseDto> {
    return this.tournamentsService.create(dto);
  }

  @Get()
  findAll(): Promise<TournamentResponseDto[]> {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TournamentResponseDto> {
    return this.tournamentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTournamentDto,
  ): Promise<TournamentResponseDto> {
    return this.tournamentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.tournamentsService.remove(id);
  }
}

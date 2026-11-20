import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateSportDto } from './dto/create-sport.dto';
import { SportResponseDto } from './dto/sport-response.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { SportsService } from './sports.service';

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Post()
  create(@Body() dto: CreateSportDto): Promise<SportResponseDto> {
    return this.sportsService.create(dto);
  }

  @Get()
  findAll(): Promise<SportResponseDto[]> {
    return this.sportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SportResponseDto> {
    return this.sportsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSportDto,
  ): Promise<SportResponseDto> {
    return this.sportsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.sportsService.remove(id);
  }
}

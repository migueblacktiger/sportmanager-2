import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
} from '@nestjs/common';
import { CreatePlayerSkillDto } from './dto/create-player-skill.dto';
import { PlayerSkillResponseDto } from './dto/player-skill-response.dto';
import { PlayerSkillsHttpExceptionFilter } from './player-skills-http-exception.filter';
import { PlayerSkillsService } from './player-skills.service';
import { PlayerResponseDto } from '../players/dto/player-response.dto';

@Controller('player-skills')
@UseFilters(PlayerSkillsHttpExceptionFilter)
export class PlayerSkillsController {
  constructor(private readonly playerSkillsService: PlayerSkillsService) {}

  @Post()
  create(@Body() dto: CreatePlayerSkillDto): Promise<PlayerSkillResponseDto> {
    return this.playerSkillsService.create(dto);
  }

  @Get('players/:playerId')
  findByPlayer(
    @Param('playerId', ParseIntPipe) playerId: number,
  ): Promise<PlayerSkillResponseDto[]> {
    return this.playerSkillsService.findByPlayer(playerId);
  }

  @Get('skills/:skillId')
  findBySkill(
    @Param('skillId', ParseIntPipe) skillId: number,
  ): Promise<PlayerResponseDto[]> {
    return this.playerSkillsService.findBySkill(skillId);
  }

  @Delete(':playerId/:skillId')
  remove(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Param('skillId', ParseIntPipe) skillId: number,
  ): Promise<{ message: string }> {
    return this.playerSkillsService.remove(playerId, skillId);
  }
}

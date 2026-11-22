import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from '../players/entities/player.entity';
import { PlayerMapper } from '../players/mappers/player.mapper';
import { Skill } from '../skills/entities/skill.entity';
import { SkillMapper } from '../skills/mappers/skill.mapper';
import { PlayerSkill } from './entities/player-skill.entity';
import { PlayerSkillMapper } from './mappers/player-skill.mapper';
import { PlayerSkillsRepository } from './repositories/player-skills.repository';
import { PlayerSkillsController } from './player-skills.controller';
import { PlayerSkillsService } from './player-skills.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerSkill, Player, Skill])],
  controllers: [PlayerSkillsController],
  providers: [
    PlayerSkillsService,
    PlayerSkillsRepository,
    PlayerSkillMapper,
    PlayerMapper,
    SkillMapper,
  ],
})
export class PlayerSkillsModule {}

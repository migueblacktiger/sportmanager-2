import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamMapper } from './mappers/team.mapper';
import { TeamsRepository } from './repositories/teams.repository';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [TypeOrmModule.forFeature([Team])],
  controllers: [TeamsController],
  providers: [TeamsService, TeamMapper, TeamsRepository],
  exports: [TeamsService],
})
export class TeamsModule {}

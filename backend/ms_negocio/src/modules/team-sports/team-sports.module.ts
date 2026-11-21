import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/entities/team.entity';
import { Sport } from '../sports/entities/sport.entity';
import { TeamMapper } from '../teams/mappers/team.mapper';
import { SportMapper } from '../sports/mappers/sport.mapper';
import { TeamSport } from './entities/team-sport.entity';
import { TeamSportMapper } from './mappers/team-sport.mapper';
import { TeamSportsRepository } from './repositories/team-sports.repository';
import { TeamSportsService } from './team-sports.service';
import { TeamSportsController } from './team-sports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TeamSport, Team, Sport])],
  controllers: [TeamSportsController],
  providers: [TeamSportsService, TeamSportsRepository, TeamSportMapper, TeamMapper, SportMapper],
  exports: [TeamSportsService],
})
export class TeamSportsModule {}

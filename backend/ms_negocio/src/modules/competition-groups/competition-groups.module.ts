import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { CompetitionGroupsController } from './competition-groups.controller';
import { CompetitionGroupsService } from './competition-groups.service';
import { CompetitionGroup } from './entities/competition-group.entity';
import { CompetitionGroupMapper } from './mappers/competition-group.mapper';
import { CompetitionGroupsRepository } from './repositories/competition-groups.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CompetitionGroup, TournamentPhase, Tournament])],
  controllers: [CompetitionGroupsController],
  providers: [CompetitionGroupsService, CompetitionGroupsRepository, CompetitionGroupMapper],
})
export class CompetitionGroupsModule {}

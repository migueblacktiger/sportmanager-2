import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionGroup } from '../competition-groups/entities/competition-group.entity';
import { GroupTeam } from '../group-teams/entities/group-team.entity';
import { MatchDetail } from '../match-management/entities/match-detail.entity';
import { MatchAnnotation } from '../match-results/entities/match-annotation.entity';
import { MatchResult } from '../match-results/entities/match-result.entity';
import { Match } from '../matches/entities/match.entity';
import { Sport } from '../sports/entities/sport.entity';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentOverviewMapper } from './mappers/tournament-overview.mapper';
import { TournamentOverviewRepository } from './repositories/tournament-overview.repository';
import { TournamentOverviewController } from './tournament-overview.controller';
import { TournamentOverviewService } from './tournament-overview.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    Tournament, Sport, TournamentPhase, CompetitionGroup, GroupTeam, Match, MatchDetail, MatchResult,
    MatchAnnotation,
  ])],
  controllers: [TournamentOverviewController],
  providers: [TournamentOverviewService, TournamentOverviewRepository, TournamentOverviewMapper],
})
export class TournamentOverviewModule {}

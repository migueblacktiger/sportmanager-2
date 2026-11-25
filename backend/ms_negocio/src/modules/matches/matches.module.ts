import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/entities/team.entity';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { TournamentRegistration } from '../tournament-registrations/entities/tournament-registration.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { MatchManagementModule } from '../match-management/match-management.module';
import { Match } from './entities/match.entity';
import { MatchMapper } from './mappers/match.mapper';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { MatchesRepository } from './repositories/matches.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, TournamentPhase, Tournament, Team, TournamentRegistration]),
    MatchManagementModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesRepository, MatchMapper],
})
export class MatchesModule {}

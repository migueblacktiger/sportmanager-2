import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database.module';
import { validateEnvironment } from './config/environment';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SkillsModule } from './modules/skills/skills.module';
import { SportsModule } from './modules/sports/sports.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TeamSportsModule } from './modules/team-sports/team-sports.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { TournamentRegistrationsModule } from './modules/tournament-registrations/tournament-registrations.module';
import { PlayersModule } from './modules/players/players.module';
import { PlayerSkillsModule } from './modules/player-skills/player-skills.module';
import { PlayerTeamsModule } from './modules/player-teams/player-teams.module';
import { TournamentPhasesModule } from './modules/tournament-phases/tournament-phases.module';
import { CompetitionGroupsModule } from './modules/competition-groups/competition-groups.module';
import { GroupTeamsModule } from './modules/group-teams/group-teams.module';
import { MatchesModule } from './modules/matches/matches.module';
import { FinalPhasesModule } from './modules/final-phases/final-phases.module';
import { VenuesModule } from './modules/venues/venues.module';
import { MatchManagementModule } from './modules/match-management/match-management.module';
import { MatchResultsModule } from './modules/match-results/match-results.module';
import { MatchAudiencesModule } from './modules/match-audiences/match-audiences.module';
import { TournamentOverviewModule } from './modules/tournament-overview/tournament-overview.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    CommonModule,
    SportsModule,
    SkillsModule,
    TeamsModule,
    TeamSportsModule,
    TournamentsModule,
    TournamentRegistrationsModule,
    PlayersModule,
    PlayerSkillsModule,
    PlayerTeamsModule,
    TournamentPhasesModule,
    CompetitionGroupsModule,
    GroupTeamsModule,
    MatchesModule,
    FinalPhasesModule,
    VenuesModule,
    MatchManagementModule,
    MatchResultsModule,
    MatchAudiencesModule,
    TournamentOverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

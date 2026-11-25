import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionGroup } from '../competition-groups/entities/competition-group.entity';
import { Team } from '../teams/entities/team.entity';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { TournamentRegistration } from '../tournament-registrations/entities/tournament-registration.entity';
import { GroupTeam } from './entities/group-team.entity';
import { GroupTeamsController } from './group-teams.controller';
import { GroupTeamsService } from './group-teams.service';
import { GroupTeamMapper } from './mappers/group-team.mapper';
import { GroupTeamsRepository } from './repositories/group-teams.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupTeam, CompetitionGroup, TournamentPhase, Team, TournamentRegistration]),
  ],
  controllers: [GroupTeamsController],
  providers: [GroupTeamsService, GroupTeamsRepository, GroupTeamMapper],
})
export class GroupTeamsModule {}

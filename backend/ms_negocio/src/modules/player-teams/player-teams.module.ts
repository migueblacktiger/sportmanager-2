import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from '../players/entities/player.entity';
import { PlayerMapper } from '../players/mappers/player.mapper';
import { Team } from '../teams/entities/team.entity';
import { TeamMapper } from '../teams/mappers/team.mapper';
import { PlayerTeam } from './entities/player-team.entity';
import { PlayerTeamMapper } from './mappers/player-team.mapper';
import { PlayerTeamsRepository } from './repositories/player-teams.repository';
import { PlayerTeamsService } from './player-teams.service';
import { PlayerTeamsController } from './player-teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerTeam, Player, Team])],
  controllers: [PlayerTeamsController],
  providers: [PlayerTeamsService, PlayerTeamsRepository, PlayerTeamMapper, PlayerMapper, TeamMapper],
  exports: [PlayerTeamsService],
})
export class PlayerTeamsModule {}

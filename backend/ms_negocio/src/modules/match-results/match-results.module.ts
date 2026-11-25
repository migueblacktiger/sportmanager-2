import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchDetail } from '../match-management/entities/match-detail.entity';
import { FanDirectoryClient } from '../match-management/notifications/fan-directory.client';
import { MailSenderClient } from '../match-management/notifications/mail-sender.client';
import { Match } from '../matches/entities/match.entity';
import { PlayerTeam } from '../player-teams/entities/player-team.entity';
import { Player } from '../players/entities/player.entity';
import { Team } from '../teams/entities/team.entity';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { MatchAnnotation } from './entities/match-annotation.entity';
import { MatchResult } from './entities/match-result.entity';
import { MatchAnnotationsController } from './match-annotations.controller';
import { MatchAnnotationsService } from './match-annotations.service';
import { MatchResultsController } from './match-results.controller';
import { MatchResultsService } from './match-results.service';
import { MatchResultsMapper } from './mappers/match-results.mapper';
import { MatchResultsNotificationService } from './notifications/match-results-notification.service';
import { MatchResultsRepository } from './repositories/match-results.repository';
import { MatchAudiencesModule } from '../match-audiences/match-audiences.module';

@Module({
  imports: [TypeOrmModule.forFeature([
    MatchResult, MatchAnnotation, MatchDetail, Match, TournamentPhase, Tournament, Team, Player, PlayerTeam,
  ]), MatchAudiencesModule],
  controllers: [MatchResultsController, MatchAnnotationsController],
  providers: [
    MatchResultsService,
    MatchAnnotationsService,
    MatchResultsRepository,
    MatchResultsMapper,
    MatchResultsNotificationService,
    // Adaptadores de HU-GC-06 reutilizados tal cual (sin modificarlos): directorio de aficionados y correo.
    FanDirectoryClient,
    MailSenderClient,
  ],
  exports: [MatchResultsService],
})
export class MatchResultsModule {}

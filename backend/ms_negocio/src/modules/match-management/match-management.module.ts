import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { Team } from '../teams/entities/team.entity';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { TournamentRegistration } from '../tournament-registrations/entities/tournament-registration.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { Venue } from '../venues/entities/venue.entity';
import { MatchAttendance } from './entities/match-attendance.entity';
import { MatchDetail } from './entities/match-detail.entity';
import { MatchResult } from '../match-results/entities/match-result.entity';
import { MatchResultsModule } from '../match-results/match-results.module';
import { MatchManagementMapper } from './mappers/match-management.mapper';
import { MatchAttendancesController } from './match-attendances.controller';
import { MatchAttendancesService } from './match-attendances.service';
import { MatchManagementController } from './match-management.controller';
import { MatchManagementService } from './match-management.service';
import { FanDirectoryClient } from './notifications/fan-directory.client';
import { MailSenderClient } from './notifications/mail-sender.client';
import { MatchNotificationService } from './notifications/match-notification.service';
import { MatchAttendancesRepository } from './repositories/match-attendances.repository';
import { MatchManagementRepository } from './repositories/match-management.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatchDetail, MatchAttendance, MatchResult, Match, TournamentPhase, Tournament, Team, TournamentRegistration, Venue,
    ]),
    MatchResultsModule,
  ],
  controllers: [MatchManagementController, MatchAttendancesController],
  providers: [
    MatchManagementService,
    MatchAttendancesService,
    MatchManagementRepository,
    MatchAttendancesRepository,
    MatchManagementMapper,
    MatchNotificationService,
    FanDirectoryClient,
    MailSenderClient,
  ],
  exports: [MatchManagementService],
})
export class MatchManagementModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../teams/entities/team.entity';
import { TeamSport } from '../team-sports/entities/team-sport.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentRegistration } from './entities/tournament-registration.entity';
import { TournamentRegistrationMapper } from './mappers/tournament-registration.mapper';
import { TournamentRegistrationsRepository } from './repositories/tournament-registrations.repository';
import { TournamentRegistrationsController } from './tournament-registrations.controller';
import { TournamentRegistrationsService } from './tournament-registrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentRegistration, Tournament, Team, TeamSport])],
  controllers: [TournamentRegistrationsController],
  providers: [
    TournamentRegistrationsService,
    TournamentRegistrationsRepository,
    TournamentRegistrationMapper,
  ],
})
export class TournamentRegistrationsModule {}

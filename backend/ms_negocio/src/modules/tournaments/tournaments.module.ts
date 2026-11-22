import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport } from '../sports/entities/sport.entity';
import { Tournament } from './entities/tournament.entity';
import { TournamentMapper } from './mappers/tournament.mapper';
import { TournamentsRepository } from './repositories/tournaments.repository';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, Sport])],
  controllers: [TournamentsController],
  providers: [TournamentsService, TournamentsRepository, TournamentMapper],
  exports: [TournamentsService],
})
export class TournamentsModule {}

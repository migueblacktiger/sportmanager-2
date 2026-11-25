import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { TournamentPhase } from './entities/tournament-phase.entity';
import { TournamentPhaseMapper } from './mappers/tournament-phase.mapper';
import { TournamentPhasesRepository } from './repositories/tournament-phases.repository';
import { TournamentPhasesController } from './tournament-phases.controller';
import { TournamentPhasesService } from './tournament-phases.service';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentPhase, Tournament])],
  controllers: [TournamentPhasesController],
  providers: [TournamentPhasesService, TournamentPhasesRepository, TournamentPhaseMapper],
})
export class TournamentPhasesModule {}

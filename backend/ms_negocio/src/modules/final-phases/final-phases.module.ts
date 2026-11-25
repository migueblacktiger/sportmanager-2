import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { MatchMapper } from '../matches/mappers/match.mapper';
import { TournamentPhase } from '../tournament-phases/entities/tournament-phase.entity';
import { Tournament } from '../tournaments/entities/tournament.entity';
import { FinalPhasesController } from './final-phases.controller';
import { FinalPhasesService } from './final-phases.service';
import { FinalPhaseMapper } from './mappers/final-phase.mapper';
import { FinalPhasesRepository } from './repositories/final-phases.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentPhase, Tournament, Match])],
  controllers: [FinalPhasesController],
  providers: [FinalPhasesService, FinalPhasesRepository, FinalPhaseMapper, MatchMapper],
})
export class FinalPhasesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { MatchAudience } from './entities/match-audience.entity';
import { MatchAudienceController } from './match-audience.controller';
import { MatchAudienceService } from './match-audience.service';
import { MatchAudienceRepository } from './repositories/match-audience.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchAudience])],
  controllers: [MatchAudienceController],
  providers: [MatchAudienceService, MatchAudienceRepository],
  exports: [MatchAudienceService],
})
export class MatchAudiencesModule {}

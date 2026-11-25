import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from './entities/venue.entity';
import { VenueMapper } from './mappers/venue.mapper';
import { VenuesRepository } from './repositories/venues.repository';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [TypeOrmModule.forFeature([Venue])],
  controllers: [VenuesController],
  providers: [VenuesService, VenuesRepository, VenueMapper],
})
export class VenuesModule {}

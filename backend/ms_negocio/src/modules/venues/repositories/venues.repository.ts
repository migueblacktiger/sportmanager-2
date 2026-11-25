import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Venue } from '../entities/venue.entity';

@Injectable()
export class VenuesRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findAll(): Promise<Venue[]> {
    return this.dataSource.getRepository(Venue).find({ order: { name: 'ASC', id: 'ASC' } });
  }

  findById(id: number): Promise<Venue | null> {
    return this.dataSource.getRepository(Venue).findOneBy({ id });
  }

  save(venue: Venue): Promise<Venue> {
    return this.dataSource.getRepository(Venue).save(venue);
  }

  async remove(id: number): Promise<boolean> {
    // delete directo: conserva las FK RESTRICT sin cascadas del ORM.
    const result = await this.dataSource.getRepository(Venue).delete(id);
    return (result.affected ?? 0) > 0;
  }
}

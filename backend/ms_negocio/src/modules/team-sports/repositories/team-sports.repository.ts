import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { TeamSport } from '../entities/team-sport.entity';
import { Tournament } from '../../tournaments/entities/tournament.entity';
import { TournamentRegistration } from '../../tournament-registrations/entities/tournament-registration.entity';
import { TeamSportHasTournamentRegistrationsError } from './team-sport.errors';

@Injectable()
export class TeamSportsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findTeamById(id: number): Promise<Team | null> {
    return this.dataSource.getRepository(Team).findOneBy({ id });
  }

  async findSportById(id: number): Promise<Sport | null> {
    return this.dataSource.getRepository(Sport).findOneBy({ id });
  }

  async findByPair(teamId: number, sportId: number): Promise<TeamSport | null> {
    return this.dataSource.getRepository(TeamSport).findOne({
      where: { teamId, sportId }, relations: { team: true, sport: true },
    });
  }

  async findByTeamId(teamId: number): Promise<TeamSport[]> {
    return this.dataSource.getRepository(TeamSport).find({
      where: { teamId }, relations: { team: true, sport: true },
      order: { sport: { name: 'ASC' }, sportId: 'ASC' },
    });
  }

  async findBySportId(sportId: number): Promise<TeamSport[]> {
    return this.dataSource.getRepository(TeamSport).find({
      where: { sportId }, relations: { team: true, sport: true },
      order: { team: { name: 'ASC' }, teamId: 'ASC' },
    });
  }

  async save(association: TeamSport): Promise<TeamSport> {
    return this.dataSource.getRepository(TeamSport).save(association);
  }

  async remove(teamId: number, sportId: number): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      const associations = manager.getRepository(TeamSport);
      const association = await associations.findOne({
        where: { teamId, sportId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!association) return false;

      const dependentRegistration = await manager.getRepository(TournamentRegistration)
        .createQueryBuilder('registration')
        .innerJoin('registration.tournament', 'tournament')
        .where('registration.teamId = :teamId', { teamId })
        .andWhere('tournament.sportId = :sportId', { sportId })
        .select('registration.id')
        .getOne();
      if (dependentRegistration) throw new TeamSportHasTournamentRegistrationsError();

      const result = await associations.delete({ teamId, sportId });
      return (result.affected ?? 0) > 0;
    });
  }
}

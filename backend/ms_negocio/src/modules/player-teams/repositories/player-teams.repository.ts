import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';
import { PlayerTeam } from '../entities/player-team.entity';

export class PlayerTeamsUnitOfWork {
  constructor(private readonly manager: EntityManager) {}

  findPlayerForUpdate(id: number): Promise<Player | null> {
    return this.manager.getRepository(Player).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  findTeamForShare(id: number): Promise<Team | null> {
    return this.manager.getRepository(Team).findOne({ where: { id }, lock: { mode: 'pessimistic_read' } });
  }

  findPairForUpdate(playerId: number, teamId: number): Promise<PlayerTeam[]> {
    // A locking/current read avoids stale REPEATABLE READ snapshots after waiting.
    return this.manager.getRepository(PlayerTeam).find({
      where: { playerId, teamId }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' },
    });
  }

  findContractForUpdate(id: number): Promise<PlayerTeam | null> {
    return this.manager.getRepository(PlayerTeam).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
  }

  findContract(id: number): Promise<PlayerTeam | null> {
    return this.manager.getRepository(PlayerTeam).findOne({ where: { id }, relations: { player: true, team: true } });
  }

  save(entity: PlayerTeam): Promise<PlayerTeam> {
    return this.manager.getRepository(PlayerTeam).save(entity);
  }
}

@Injectable()
export class PlayerTeamsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  transaction<T>(work: (unitOfWork: PlayerTeamsUnitOfWork) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(manager => work(new PlayerTeamsUnitOfWork(manager)));
  }

  findPlayer(id: number): Promise<Player | null> { return this.dataSource.getRepository(Player).findOneBy({ id }); }
  findTeam(id: number): Promise<Team | null> { return this.dataSource.getRepository(Team).findOneBy({ id }); }
  findById(id: number): Promise<PlayerTeam | null> { return this.dataSource.getRepository(PlayerTeam).findOneBy({ id }); }

  findByPlayer(playerId: number): Promise<PlayerTeam[]> {
    return this.dataSource.getRepository(PlayerTeam).find({
      where: { playerId }, relations: { player: true, team: true }, order: { startDate: 'DESC', id: 'DESC' },
    });
  }

  findByTeam(teamId: number): Promise<PlayerTeam[]> {
    return this.dataSource.getRepository(PlayerTeam).find({
      where: { teamId }, relations: { player: true, team: true }, order: { startDate: 'DESC', id: 'DESC' },
    });
  }
}

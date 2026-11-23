import { DataSource, EntityManager } from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Team } from '../../teams/entities/team.entity';
import { PlayerTeam } from '../entities/player-team.entity';
import { PlayerTeamsRepository, PlayerTeamsUnitOfWork } from './player-teams.repository';

describe('PlayerTeams persistence and lock boundary', () => {
  const playerRepo = { findOne: jest.fn(), findOneBy: jest.fn() };
  const teamRepo = { findOne: jest.fn(), findOneBy: jest.fn() };
  const contractRepo = { findOne: jest.fn(), findOneBy: jest.fn(), find: jest.fn(), save: jest.fn() };
  const getRepository = jest.fn((entity: unknown) => entity === Player ? playerRepo : entity === Team ? teamRepo : contractRepo);
  const manager = { getRepository } as unknown as EntityManager;
  const transaction = jest.fn();
  const source = { transaction, getRepository } as unknown as DataSource;
  let repository: PlayerTeamsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PlayerTeamsRepository(source);
    transaction.mockImplementation(async work => work(manager));
  });

  it('uses the DataSource transaction and the provided transactional EntityManager', async () => {
    await repository.transaction(async unit => { await unit.findPlayerForUpdate(2); await unit.findTeamForShare(3); await unit.findPairForUpdate(2, 3); });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(playerRepo.findOne).toHaveBeenCalledWith({ where: { id: 2 }, lock: { mode: 'pessimistic_write' } });
    expect(teamRepo.findOne).toHaveBeenCalledWith({ where: { id: 3 }, lock: { mode: 'pessimistic_read' } });
    expect(contractRepo.find).toHaveBeenCalledWith({ where: { playerId: 2, teamId: 3 }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' } });
  });

  it('requests a current locked contract read before finishing', async () => {
    const unit = new PlayerTeamsUnitOfWork(manager);
    await unit.findContractForUpdate(7);
    expect(contractRepo.findOne).toHaveBeenCalledWith({ where: { id: 7 }, lock: { mode: 'pessimistic_write' } });
  });

  it('propagates a transaction failure to trigger rollback instead of reporting success', async () => {
    const error = new Error('Failure inside transaction');
    await expect(repository.transaction(async () => { throw error; })).rejects.toBe(error);
  });

  it('saves through the transactional repository without exposing deletion', async () => {
    const unit = new PlayerTeamsUnitOfWork(manager);
    const entity = Object.assign(new PlayerTeam(), { id: 7 });
    await unit.save(entity);
    expect(contractRepo.save).toHaveBeenCalledWith(entity);
    expect('remove' in unit).toBe(false); expect('delete' in repository).toBe(false);
  });

  it('loads full history without excluding closed or expired contracts', async () => {
    await repository.findByPlayer(2); await repository.findByTeam(3);
    expect(contractRepo.find).toHaveBeenCalledWith({ where: { playerId: 2 }, relations: { player: true, team: true }, order: { startDate: 'DESC', id: 'DESC' } });
    expect(contractRepo.find).toHaveBeenCalledWith({ where: { teamId: 3 }, relations: { player: true, team: true }, order: { startDate: 'DESC', id: 'DESC' } });
  });
});

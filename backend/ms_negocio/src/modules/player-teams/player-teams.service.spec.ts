import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Player } from '../players/entities/player.entity';
import { PlayerMapper } from '../players/mappers/player.mapper';
import { Team } from '../teams/entities/team.entity';
import { TeamMapper } from '../teams/mappers/team.mapper';
import { PlayerTeam } from './entities/player-team.entity';
import { PlayerTeamStatus as Status } from './dto/player-team-status';
import { PlayerTeamMapper } from './mappers/player-team.mapper';
import { PlayerTeamsRepository } from './repositories/player-teams.repository';
import { PlayerTeamsService } from './player-teams.service';

const now = new Date('2026-11-22T15:00:00.123Z');
const player = Object.assign(new Player(), { id: 2, name: 'Ana', identification: null, description: null, active: true });
const team = Object.assign(new Team(), { id: 3, name: 'Equipo', description: null, active: true });
const dto = { playerId: 2, teamId: 3, startDate: '2026-11-01', endDate: '2026-11-30' };
const contract = (extra: Partial<PlayerTeam> = {}) => Object.assign(new PlayerTeam(), { ...dto, id: 7, finishedAt: null, player, team, ...extra });

describe('PlayerTeamsService', () => {
  const unit = {
    findPlayerForUpdate: jest.fn(), findTeamForShare: jest.fn(), findPairForUpdate: jest.fn(),
    findContractForUpdate: jest.fn(), findContract: jest.fn(), save: jest.fn(),
  };
  const repository = {
    transaction: jest.fn(), findPlayer: jest.fn(), findTeam: jest.fn(), findById: jest.fn(),
    findByPlayer: jest.fn(), findByTeam: jest.fn(),
  };
  let service: PlayerTeamsService;
  let current: PlayerTeam;

  beforeEach(async () => {
    jest.resetAllMocks(); jest.useFakeTimers({ now });
    current = contract();
    const module = await Test.createTestingModule({ providers: [
      PlayerTeamsService, PlayerTeamMapper, PlayerMapper, TeamMapper,
      { provide: PlayerTeamsRepository, useValue: repository },
    ] }).compile();
    service = module.get(PlayerTeamsService);
    repository.transaction.mockImplementation(async work => work(unit));
    repository.findPlayer.mockResolvedValue(player); repository.findTeam.mockResolvedValue(team);
    repository.findById.mockResolvedValue(current);
    unit.findPlayerForUpdate.mockResolvedValue(player); unit.findTeamForShare.mockResolvedValue(team);
    unit.findPairForUpdate.mockResolvedValue([]);
    unit.findContractForUpdate.mockImplementation(async () => current);
    unit.findContract.mockImplementation(async () => current);
    unit.save.mockImplementation(async entity => { entity.id ??= 7; return entity; });
  });
  afterEach(() => jest.useRealTimers());

  it('creates a contract with public nested data and no caller-controlled finish timestamp', async () => {
    await expect(service.create(dto)).resolves.toMatchObject({ ...dto, status: Status.Current, finishedAt: null, player: { id: 2 }, team: { id: 3 } });
    expect(unit.save).toHaveBeenCalledWith(expect.objectContaining({ finishedAt: null }));
    expect(unit.findPlayerForUpdate.mock.invocationCallOrder[0]).toBeLessThan(unit.findPairForUpdate.mock.invocationCallOrder[0]);
  });

  it('returns 404 for a missing player before checking overlaps', async () => {
    unit.findPlayerForUpdate.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(unit.findPairForUpdate).not.toHaveBeenCalled(); expect(unit.save).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing team', async () => {
    unit.findTeamForShare.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(unit.save).not.toHaveBeenCalled();
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-01', '2026-11-31', '2026-11-01T00:00:00Z', '26-11-01', '0000-01-01', '10000-01-01', ''])('rejects invalid start date %s', async startDate => {
    await expect(service.create({ ...dto, startDate })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it.each(['2026-02-29', '2026-10-31'])('rejects invalid or inverted end date %s', async endDate => {
    await expect(service.create({ ...dto, endDate })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it('accepts leap days and a one-day contract', async () => {
    await expect(service.create({ ...dto, startDate: '2028-02-29', endDate: '2028-02-29' })).resolves.toMatchObject({ status: Status.Scheduled });
  });

  it.each([0, -1, 1.1, 2147483648, NaN])('rejects invalid IDs %s', async playerId => {
    await expect(service.create({ ...dto, playerId })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['2026-11-01', '2026-11-30'], ['2026-11-15', '2026-12-10'],
    ['2026-10-01', '2026-11-01'], ['2026-10-01', '2026-12-01'], ['2026-11-30', '2026-12-01'],
  ])('rejects effective overlap including inclusive shared days (%s, %s)', async (startDate, endDate) => {
    unit.findPairForUpdate.mockResolvedValue([current]);
    await expect(service.create({ ...dto, startDate, endDate })).rejects.toBeInstanceOf(ConflictException);
    expect(unit.save).not.toHaveBeenCalled();
  });

  it.each([['2026-12-01', '2026-12-31'], ['2026-10-01', '2026-10-31']])('permits consecutive contracts (%s, %s)', async (startDate, endDate) => {
    unit.findPairForUpdate.mockResolvedValue([current]);
    await expect(service.create({ ...dto, startDate, endDate })).resolves.toMatchObject({ startDate, endDate });
  });

  it('checks only the same pair and permits simultaneous assignments to different teams', async () => {
    unit.findTeamForShare.mockResolvedValue({ ...team, id: 9 });
    await service.create({ ...dto, teamId: 9 });
    expect(unit.findPairForUpdate).toHaveBeenCalledWith(2, 9);
    expect(unit.save).toHaveBeenCalled();
  });

  it('does not impose active-state restrictions on existing players and teams', async () => {
    unit.findPlayerForUpdate.mockResolvedValue({ ...player, active: false });
    unit.findTeamForShare.mockResolvedValue({ ...team, active: false });
    await expect(service.create(dto)).resolves.toMatchObject({ player: { active: false }, team: { active: false } });
  });

  it('permits a return after early closure without changing original contract dates', async () => {
    current.finishedAt = new Date('2026-11-20T15:00:00Z');
    unit.findPairForUpdate.mockResolvedValue([current]);
    await expect(service.create({ ...dto, startDate: '2026-11-21' })).resolves.toMatchObject({ startDate: '2026-11-21' });
    expect(current.startDate).toBe(dto.startDate); expect(current.endDate).toBe(dto.endDate);
  });

  it('retains the historical effective portion of an early-closed contract', async () => {
    current.finishedAt = new Date('2026-11-20T15:00:00Z');
    unit.findPairForUpdate.mockResolvedValue([current]);
    await expect(service.create({ ...dto, startDate: '2026-11-20' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('permits reuse of an interval canceled before its start', async () => {
    current.startDate = '2026-12-01'; current.endDate = '2026-12-31'; current.finishedAt = now;
    unit.findPairForUpdate.mockResolvedValue([current]);
    await expect(service.create({ ...dto, startDate: current.startDate, endDate: current.endDate })).resolves.toMatchObject({ status: Status.Scheduled });
  });

  it('finishes early in UTC, preserves identity and dates, and is idempotent', async () => {
    const first = await service.finish(7);
    expect(first).toMatchObject({ ...dto, id: 7, finishedAt: now.toISOString(), status: Status.Finished });
    jest.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const second = await service.finish(7);
    expect(second.finishedAt).toBe(first.finishedAt);
    expect(unit.save).toHaveBeenCalledTimes(1);
  });

  it('allows withdrawal of a future assignment without deleting its history', async () => {
    current.startDate = '2026-12-01'; current.endDate = '2026-12-31';
    await expect(service.finish(7)).resolves.toMatchObject({ status: Status.Finished, startDate: '2026-12-01', endDate: '2026-12-31' });
  });

  it('leaves naturally expired contracts unchanged', async () => {
    current.endDate = '2026-11-21';
    await expect(service.finish(7)).resolves.toMatchObject({ status: Status.Expired, finishedAt: null });
    expect(unit.save).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown contract', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.finish(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it('rechecks the contract after obtaining the parent lock', async () => {
    unit.findContractForUpdate.mockResolvedValue(null);
    await expect(service.finish(7)).rejects.toBeInstanceOf(NotFoundException);
    expect(unit.save).not.toHaveBeenCalled();
  });

  it('returns the full history by default and filters without changing stored records', async () => {
    const history = [current, contract({ id: 8, startDate: '2027-01-01', endDate: '2027-02-01' }),
      contract({ id: 9, endDate: '2026-11-21' }), contract({ id: 10, finishedAt: now })];
    repository.findByTeam.mockResolvedValue(history); repository.findByPlayer.mockResolvedValue(history);
    const original = JSON.stringify(history);
    expect((await service.findByTeam(3)).map(r => r.status)).toEqual([Status.Current, Status.Scheduled, Status.Expired, Status.Finished]);
    expect(await service.findByPlayer(2, Status.Finished)).toHaveLength(1);
    expect(JSON.stringify(history)).toBe(original); expect(unit.save).not.toHaveBeenCalled();
  });

  it('uses Bogota rather than the UTC calendar day at boundaries', async () => {
    repository.findByTeam.mockResolvedValue([contract({ startDate: '2026-11-22', endDate: '2026-11-22' })]);
    for (const [instant, expected] of [
      ['2026-11-22T04:59:59.999Z', Status.Scheduled], ['2026-11-22T05:00:00Z', Status.Current],
      ['2026-11-23T04:59:59.999Z', Status.Current], ['2026-11-23T05:00:00Z', Status.Expired],
    ] as const) {
      jest.setSystemTime(new Date(instant));
      expect((await service.findByTeam(3))[0].status).toBe(expected);
    }
  });

  it('returns 404 when the queried parent does not exist', async () => {
    repository.findPlayer.mockResolvedValue(null); repository.findTeam.mockResolvedValue(null);
    await expect(service.findByPlayer(99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findByTeam(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an empty list for an existing parent without contracts', async () => {
    repository.findByPlayer.mockResolvedValue([]);
    await expect(service.findByPlayer(2)).resolves.toEqual([]);
  });

  it('rejects an invalid status rather than silently ignoring it', async () => {
    await expect(service.findByPlayer(2, 'otro' as Status)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not hide unexpected database failures', async () => {
    const error = new Error('Database unavailable'); unit.save.mockRejectedValue(error);
    await expect(service.create(dto)).rejects.toBe(error);
  });

  it('maps concurrent reference deletion to 404', async () => {
    unit.save.mockRejectedValue(new QueryFailedError('insert', [], Object.assign(new Error(), { code: 'ER_NO_REFERENCED_ROW_2' })));
    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  function simulateSerializedTransactions() {
    let tail = Promise.resolve();
    repository.transaction.mockImplementation(async work => {
      const previous = tail; let release!: () => void;
      tail = new Promise<void>(resolve => { release = resolve; });
      await previous;
      try { return await work(unit); } finally { release(); }
    });
  }

  it('concurrent duplicate requests produce one contract and one 409 under the transaction lock', async () => {
    simulateSerializedTransactions(); const rows: PlayerTeam[] = [];
    unit.findPairForUpdate.mockImplementation(async () => rows);
    unit.save.mockImplementation(async entity => { entity.id = 11; rows.push(entity); return entity; });
    const result = await Promise.allSettled([service.create(dto), service.create(dto)]);
    expect(result.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.find(r => r.status === 'rejected')).toMatchObject({ reason: expect.any(ConflictException) });
    expect(rows).toHaveLength(1);
  });

  it('concurrent finishing requests persist the original timestamp once', async () => {
    simulateSerializedTransactions();
    const result = await Promise.all([service.finish(7), service.finish(7)]);
    expect(result[0].finishedAt).toBe(result[1].finishedAt);
    expect(unit.save).toHaveBeenCalledTimes(1);
  });
});

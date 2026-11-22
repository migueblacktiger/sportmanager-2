import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { Team } from '../teams/entities/team.entity';
import { Sport } from '../sports/entities/sport.entity';
import { TeamMapper } from '../teams/mappers/team.mapper';
import { SportMapper } from '../sports/mappers/sport.mapper';
import { TeamSport } from './entities/team-sport.entity';
import { TeamSportMapper } from './mappers/team-sport.mapper';
import { TeamSportsRepository } from './repositories/team-sports.repository';
import { TeamSportHasTournamentRegistrationsError } from './repositories/team-sport.errors';
import { TeamSportsService } from './team-sports.service';

describe('TeamSportsService', () => {
  let service: TeamSportsService;
  const repository = {
    findTeamById: jest.fn(), findSportById: jest.fn(), findByPair: jest.fn(),
    findByTeamId: jest.fn(), findBySportId: jest.fn(), save: jest.fn(), remove: jest.fn(),
  };
  const team = Object.assign(new Team(), { id: 2, name: 'Equipo de prueba', description: null, active: true });
  const sport = Object.assign(new Sport(), { id: 3, name: 'Deporte de prueba', description: null, active: true, parentId: null });
  const association = Object.assign(new TeamSport(), { id: 7, teamId: 2, sportId: 3, team, sport });
  const response = {
    id: 7, teamId: 2, sportId: 3,
    team: { id: 2, name: team.name, description: null, active: true },
    sport: { id: 3, name: sport.name, description: null, active: true, parentId: null },
  };
  const dbError = (code: string) => new QueryFailedError('statement', [], Object.assign(new Error(), { code }));

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [TeamSportsService, TeamSportMapper, TeamMapper, SportMapper,
        { provide: TeamSportsRepository, useValue: repository }],
    }).compile();
    service = module.get(TeamSportsService);
    repository.findTeamById.mockResolvedValue(team);
    repository.findSportById.mockResolvedValue(sport);
    repository.findByPair.mockResolvedValue(null);
    repository.save.mockResolvedValue(association);
  });

  it('creates an association and returns nested public DTOs', async () => {
    await expect(service.create({ teamId: 2, sportId: 3 })).resolves.toEqual(response);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ teamId: 2, sportId: 3, team, sport }));
    expect(repository.findTeamById.mock.invocationCallOrder[0]).toBeLessThan(repository.save.mock.invocationCallOrder[0]);
    expect(repository.findSportById.mock.invocationCallOrder[0]).toBeLessThan(repository.save.mock.invocationCallOrder[0]);
  });

  it('rejects a missing team before saving', async () => {
    repository.findTeamById.mockResolvedValue(null);
    await expect(service.create({ teamId: 2, sportId: 3 })).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a missing sport before saving', async () => {
    repository.findSportById.mockResolvedValue(null);
    await expect(service.create({ teamId: 2, sportId: 3 })).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an association that already exists', async () => {
    repository.findByPair.mockResolvedValue(association);
    await expect(service.create({ teamId: 2, sportId: 3 })).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('translates a concurrent duplicate detected by MySQL to 409', async () => {
    repository.save.mockRejectedValue(dbError('ER_DUP_ENTRY'));
    await expect(service.create({ teamId: 2, sportId: 3 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 if a referenced record disappears before saving', async () => {
    repository.save.mockRejectedValue(dbError('ER_NO_REFERENCED_ROW_2'));
    await expect(service.create({ teamId: 2, sportId: 3 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not hide unexpected persistence failures', async () => {
    const error = new Error('Unexpected persistence error');
    repository.save.mockRejectedValue(error);
    await expect(service.create({ teamId: 2, sportId: 3 })).rejects.toBe(error);
  });

  it('lists sports associated with an existing team', async () => {
    repository.findByTeamId.mockResolvedValue([association]);
    await expect(service.findByTeam(2)).resolves.toEqual([response]);
    expect(repository.findByTeamId).toHaveBeenCalledWith(2);
  });

  it('returns an empty list for an existing team without associations', async () => {
    repository.findByTeamId.mockResolvedValue([]);
    await expect(service.findByTeam(2)).resolves.toEqual([]);
  });

  it('returns 404 when querying an unknown team', async () => {
    repository.findTeamById.mockResolvedValue(null);
    await expect(service.findByTeam(2)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findByTeamId).not.toHaveBeenCalled();
  });

  it('lists teams associated with an existing sport', async () => {
    repository.findBySportId.mockResolvedValue([association]);
    await expect(service.findBySport(3)).resolves.toEqual([response]);
    expect(repository.findBySportId).toHaveBeenCalledWith(3);
  });

  it('returns an empty list for an existing sport without associations', async () => {
    repository.findBySportId.mockResolvedValue([]);
    await expect(service.findBySport(3)).resolves.toEqual([]);
  });

  it('returns 404 when querying an unknown sport', async () => {
    repository.findSportById.mockResolvedValue(null);
    await expect(service.findBySport(3)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findBySportId).not.toHaveBeenCalled();
  });

  it('removes only the requested association', async () => {
    repository.remove.mockResolvedValue(true);
    await expect(service.remove(2, 3)).resolves.toEqual({ message: 'Asociacion retirada correctamente; equipo y deporte conservados' });
    expect(repository.remove).toHaveBeenCalledWith(2, 3);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.findTeamById).not.toHaveBeenCalled();
    expect(repository.findSportById).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing association', async () => {
    repository.remove.mockResolvedValue(false);
    await expect(service.remove(2, 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.remove).toHaveBeenCalledWith(2, 3);
  });

  it('returns 404 if another request removes the association first', async () => {
    repository.remove.mockResolvedValue(false);
    await expect(service.remove(2, 3)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 409 while a tournament registration depends on the association', async () => {
    repository.remove.mockRejectedValue(new TeamSportHasTournamentRegistrationsError());
    await expect(service.remove(2, 3)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 409 if future linked data prevents removing the association', async () => {
    repository.findByPair.mockResolvedValue(association);
    repository.remove.mockRejectedValue(dbError('ER_ROW_IS_REFERENCED_2'));
    await expect(service.remove(2, 3)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([0, -1, 1.5, 2147483648])('rejects invalid identifiers %s before querying', async (id) => {
    await expect(service.create({ teamId: id, sportId: 3 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ teamId: 2, sportId: id })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.findByTeam(id)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.findBySport(id)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.remove(id, 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findTeamById).not.toHaveBeenCalled();
    expect(repository.findSportById).not.toHaveBeenCalled();
    expect(repository.findByPair).not.toHaveBeenCalled();
  });
});

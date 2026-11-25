import { MatchAudienceInputInvalidError, MatchAudienceMatchNotFoundError, MatchAudienceRegistrationNotFoundError } from './match-audience.errors';
import { MatchAudienceService } from './match-audience.service';
import { MatchAudienceSource } from './match-audience-source';
import { MatchAudienceRepository } from './repositories/match-audience.repository';

describe('MatchAudienceService', () => {
  const repository = {
    matchExists: jest.fn(),
    add: jest.fn(),
    findFanIds: jest.fn(),
    remove: jest.fn(),
  };
  let service: MatchAudienceService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository.matchExists.mockResolvedValue(true);
    repository.add.mockResolvedValue(undefined);
    repository.findFanIds.mockResolvedValue([7, 9]);
    repository.remove.mockResolvedValue(true);
    service = new MatchAudienceService(repository as unknown as MatchAudienceRepository);
  });

  it('registers ticket and bet audience membership idempotently by source', async () => {
    await expect(service.register(5, 7, MatchAudienceSource.Tickets))
      .resolves.toEqual({ matchId: 5, fanId: 7, source: MatchAudienceSource.Tickets });
    await expect(service.register(5, 7, MatchAudienceSource.Bets))
      .resolves.toEqual({ matchId: 5, fanId: 7, source: MatchAudienceSource.Bets });
    expect(repository.add).toHaveBeenNthCalledWith(1, 5, 7, MatchAudienceSource.Tickets);
    expect(repository.add).toHaveBeenNthCalledWith(2, 5, 7, MatchAudienceSource.Bets);
  });

  it('returns only the selected source or the combined audience', async () => {
    await expect(service.findBySource(5, MatchAudienceSource.Tickets)).resolves.toEqual([{ id: 7 }, { id: 9 }]);
    await expect(service.findAudience(5)).resolves.toEqual([{ id: 7 }, { id: 9 }]);
    expect(repository.findFanIds).toHaveBeenNthCalledWith(1, 5, MatchAudienceSource.Tickets);
    expect(repository.findFanIds).toHaveBeenNthCalledWith(2, 5);
  });

  it('removes only the selected relation and reports a missing relation', async () => {
    await expect(service.remove(5, 7, MatchAudienceSource.Tickets))
      .resolves.toEqual({ message: 'Relacion de tickets del aficionado 7 eliminada del partido 5' });
    expect(repository.remove).toHaveBeenCalledWith(5, 7, MatchAudienceSource.Tickets);
    repository.remove.mockResolvedValue(false);
    await expect(service.remove(5, 7, MatchAudienceSource.Bets))
      .rejects.toBeInstanceOf(MatchAudienceRegistrationNotFoundError);
  });

  it('rejects invalid IDs and requires an existing match', async () => {
    await expect(service.register(0, 7, MatchAudienceSource.Tickets))
      .rejects.toBeInstanceOf(MatchAudienceInputInvalidError);
    repository.matchExists.mockResolvedValue(false);
    await expect(service.findAudience(5)).rejects.toBeInstanceOf(MatchAudienceMatchNotFoundError);
    expect(repository.add).not.toHaveBeenCalled();
  });
});

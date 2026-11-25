import { TournamentOverviewMapper } from './mappers/tournament-overview.mapper';
import { TournamentOverviewRepository } from './repositories/tournament-overview.repository';
import { TournamentOverviewNotFoundError } from './tournament-overview.errors';
import { TournamentOverviewService } from './tournament-overview.service';

describe('TournamentOverviewService', () => {
  const repository = { load: jest.fn() };
  const mapper = { toOverviewDto: jest.fn() };
  let service: TournamentOverviewService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TournamentOverviewService(
      repository as unknown as TournamentOverviewRepository,
      mapper as unknown as TournamentOverviewMapper,
    );
  });

  it('throws not found when the tournament does not exist', async () => {
    repository.load.mockResolvedValue(null);
    await expect(service.getOverview(5, {})).rejects.toBeInstanceOf(TournamentOverviewNotFoundError);
    expect(mapper.toOverviewDto).not.toHaveBeenCalled();
  });

  it('does not load annotations unless includeAnnotations is true', async () => {
    const data = { tournament: { id: 5 } };
    repository.load.mockResolvedValue(data);
    mapper.toOverviewDto.mockReturnValue({ ok: true });
    await expect(service.getOverview(5, {})).resolves.toEqual({ ok: true });
    expect(repository.load).toHaveBeenCalledWith(5, false);
    expect(mapper.toOverviewDto).toHaveBeenCalledWith(data, false);
  });

  it('loads annotations when requested', async () => {
    repository.load.mockResolvedValue({ tournament: { id: 5 } });
    mapper.toOverviewDto.mockReturnValue({ ok: true });
    await service.getOverview(5, { includeAnnotations: true });
    expect(repository.load).toHaveBeenCalledWith(5, true);
  });
});

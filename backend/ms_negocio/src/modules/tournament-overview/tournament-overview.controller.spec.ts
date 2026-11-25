import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { TournamentOverviewController } from './tournament-overview.controller';
import { TournamentOverviewService } from './tournament-overview.service';

describe('TournamentOverviewController', () => {
  const service = { getOverview: jest.fn() };
  let controller: TournamentOverviewController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TournamentOverviewController(service as unknown as TournamentOverviewService);
  });

  it('delegates to the service with the tournament id and query', async () => {
    service.getOverview.mockResolvedValue({ phases: [] });
    await expect(controller.getOverview(7, { includeAnnotations: true })).resolves.toEqual({ phases: [] });
    expect(service.getOverview).toHaveBeenCalledWith(7, { includeAnnotations: true });
  });

  it('exposes a protected GET under the tournament', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TournamentOverviewController)).toBe('tournaments/:tournamentId/overview');
    expect(Reflect.getMetadata(METHOD_METADATA, TournamentOverviewController.prototype.getOverview)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TournamentOverviewController.prototype.getOverview)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TournamentOverviewController)).toBeUndefined();
  });
});

import { MatchAudienceController } from './match-audience.controller';
import { MatchAudienceService } from './match-audience.service';
import { MatchAudienceSource } from './match-audience-source';

describe('MatchAudienceController', () => {
  it('records ticket and bet audiences under separate sources', async () => {
    const service = { register: jest.fn().mockResolvedValue({}) };
    const controller = new MatchAudienceController(service as unknown as MatchAudienceService);

    await controller.registerTicket(5, { fanId: 7 });
    await controller.registerBet(5, { fanId: 7 });

    expect(service.register).toHaveBeenNthCalledWith(1, 5, 7, MatchAudienceSource.Tickets);
    expect(service.register).toHaveBeenNthCalledWith(2, 5, 7, MatchAudienceSource.Bets);
  });
});

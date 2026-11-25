import { MatchStatus } from './dto/match-status';
import { MatchManagementController } from './match-management.controller';
import { MatchManagementService } from './match-management.service';

describe('MatchManagementController', () => {
  it('forwards the authorization header when updating match status', async () => {
    const service = { updateStatus: jest.fn().mockResolvedValue({ id: 5 }) };
    const controller = new MatchManagementController(service as unknown as MatchManagementService);

    await controller.updateStatus(4, 5, { status: MatchStatus.Finished }, 'Bearer user-token');

    expect(service.updateStatus).toHaveBeenCalledWith(4, 5, { status: MatchStatus.Finished }, 'Bearer user-token');
  });
});

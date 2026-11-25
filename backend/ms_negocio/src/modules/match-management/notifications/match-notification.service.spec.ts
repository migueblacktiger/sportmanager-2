import { MatchAttendancesRepository } from '../repositories/match-attendances.repository';
import { FanDirectoryClient } from './fan-directory.client';
import { MailSenderClient } from './mail-sender.client';
import { MatchCreatedInfo, MatchNotificationService } from './match-notification.service';

const info: MatchCreatedInfo = {
  matchId: 9,
  tournamentName: 'Copa <Oro>',
  phaseName: 'Grupos',
  homeTeamId: 10,
  homeTeamName: 'Rojos',
  awayTeamId: 11,
  awayTeamName: 'Azules',
  scheduledAt: new Date('2027-01-10T20:00:00.000Z'),
  venueName: null,
};

describe('MatchNotificationService', () => {
  const attendances = { findFanIdsOfPreviousMatches: jest.fn() };
  const directory = { isConfigured: jest.fn(), findContacts: jest.fn() };
  const mail = { isConfigured: jest.fn(), send: jest.fn() };
  let service: MatchNotificationService;

  beforeEach(() => {
    jest.resetAllMocks();
    directory.isConfigured.mockReturnValue(true);
    mail.isConfigured.mockReturnValue(true);
    mail.send.mockResolvedValue(undefined);
    service = new MatchNotificationService(
      attendances as unknown as MatchAttendancesRepository,
      directory as unknown as FanDirectoryClient,
      mail as unknown as MailSenderClient,
    );
  });

  it('is skipped, without querying anything, when the adapters are not configured', async () => {
    mail.isConfigured.mockReturnValue(false);
    await expect(service.notifyMatchCreated(info)).resolves.toMatchObject({ skipped: true, sent: 0 });
    expect(attendances.findFanIdsOfPreviousMatches).not.toHaveBeenCalled();
  });

  it('does nothing when no fan took part in previous matches of the teams', async () => {
    attendances.findFanIdsOfPreviousMatches.mockResolvedValue([]);
    await expect(service.notifyMatchCreated(info)).resolves.toEqual({
      recipients: 0, sent: 0, failed: 0, skipped: false,
    });
    expect(directory.findContacts).not.toHaveBeenCalled();
    expect(attendances.findFanIdsOfPreviousMatches).toHaveBeenCalledWith([10, 11], 9, info.scheduledAt);
  });

  it('emails each distinct fan once, escapes the html and forwards the token', async () => {
    attendances.findFanIdsOfPreviousMatches.mockResolvedValue([1, 2, 3]);
    directory.findContacts.mockResolvedValue([
      { id: 1, email: 'ana@example.com', name: 'Ana' },
      { id: 2, email: 'ANA@example.com' },
      { id: 3, email: 'luis@example.com' },
    ]);
    const result = await service.notifyMatchCreated(info, 'Bearer abc');
    expect(directory.findContacts).toHaveBeenCalledWith([1, 2, 3], 'Bearer abc');
    expect(result).toEqual({ recipients: 2, sent: 2, failed: 0, skipped: false });
    expect(mail.send).toHaveBeenCalledTimes(2);
    const message = mail.send.mock.calls[0][0] as { to: string; subject: string; html: string };
    expect(message.to).toBe('ana@example.com');
    expect(message.subject).toBe('Nuevo partido: Rojos vs Azules');
    expect(message.html).toContain('Copa &lt;Oro&gt;');
    expect(message.html).not.toContain('<Oro>');
  });

  it('counts failed deliveries without throwing', async () => {
    attendances.findFanIdsOfPreviousMatches.mockResolvedValue([1, 2]);
    directory.findContacts.mockResolvedValue([
      { id: 1, email: 'a@example.com' }, { id: 2, email: 'b@example.com' },
    ]);
    mail.send.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('smtp down'));
    await expect(service.notifyMatchCreated(info)).resolves.toEqual({
      recipients: 2, sent: 1, failed: 1, skipped: false,
    });
  });

  it('never throws when the directory fails', async () => {
    attendances.findFanIdsOfPreviousMatches.mockResolvedValue([1]);
    directory.findContacts.mockRejectedValue(new Error('503'));
    await expect(service.notifyMatchCreated(info)).resolves.toMatchObject({
      sent: 0, skipped: false, reason: expect.any(String),
    });
  });
});

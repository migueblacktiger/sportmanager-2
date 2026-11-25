import { FanDirectoryClient } from '../../match-management/notifications/fan-directory.client';
import { MailSenderClient } from '../../match-management/notifications/mail-sender.client';
import { MatchAudienceService } from '../../match-audiences/match-audience.service';
import {
  AnnotationNotificationInfo, MatchResultsNotificationService, MatchSummaryInfo,
} from './match-results-notification.service';

const annotation: AnnotationNotificationInfo = {
  matchId: 5, tournamentName: 'Copa <Oro>', homeTeamName: 'Rojos', awayTeamName: 'Azules',
  playerName: 'Ana', teamName: 'Rojos', minute: 12, points: 1, description: null,
};
const summary: MatchSummaryInfo = {
  matchId: 5, tournamentName: 'Copa', phaseName: 'Grupos',
  homeTeamName: 'Rojos', homeScore: 2, awayTeamName: 'Azules', awayScore: 1,
  annotations: [
    { playerName: 'Ana', teamName: 'Rojos', minute: 12, points: 1, description: null },
    { playerName: 'Luis', teamName: 'Azules', minute: null, points: 2, description: 'Triple' },
  ],
};

describe('MatchResultsNotificationService', () => {
  const audience = { findAudience: jest.fn() };
  const directory = { isConfigured: jest.fn(), findContacts: jest.fn() };
  const mail = { isConfigured: jest.fn(), send: jest.fn() };
  let service: MatchResultsNotificationService;

  beforeEach(() => {
    jest.resetAllMocks();
    directory.isConfigured.mockReturnValue(true);
    mail.isConfigured.mockReturnValue(true);
    mail.send.mockResolvedValue(undefined);
    service = new MatchResultsNotificationService(
      audience as unknown as MatchAudienceService,
      directory as unknown as FanDirectoryClient,
      mail as unknown as MailSenderClient,
    );
  });

  it('is skipped without querying the audience when the mail adapter is not configured', async () => {
    mail.isConfigured.mockReturnValue(false);
    await expect(service.notifyMatchSummary(summary)).resolves.toMatchObject({ skipped: true, sent: 0 });
    expect(audience.findAudience).not.toHaveBeenCalled();
  });

  it('does nothing when nobody bought a ticket or placed a bet', async () => {
    audience.findAudience.mockResolvedValue([]);
    await expect(service.notifyAnnotation(annotation)).resolves.toEqual({
      recipients: 0, sent: 0, failed: 0, skipped: false,
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('emails each distinct address once, resolves missing emails and escapes the html', async () => {
    audience.findAudience.mockResolvedValue([
      { id: 1, email: 'ana@example.com', name: 'Ana' },
      { id: 2, email: 'ANA@example.com' },
      { id: 3 },
    ]);
    directory.findContacts.mockResolvedValue([
      { id: 3, email: 'luis@example.com', name: 'Luis' }, { id: 4, email: 'ana@example.com' },
    ]);
    const result = await service.notifyAnnotation(annotation, 'Bearer t');
    expect(audience.findAudience).toHaveBeenCalledWith(5);
    expect(directory.findContacts).toHaveBeenCalledWith([3], 'Bearer t');
    expect(result).toEqual({ recipients: 2, sent: 2, failed: 0, skipped: false });
    const message = mail.send.mock.calls[0][0] as { to: string; subject: string; html: string; text: string };
    expect(message.to).toBe('ana@example.com');
    expect(message.subject).toBe('Anotacion en Rojos vs Azules');
    expect(message.text).toContain('min 12: Ana (Rojos)');
    expect(message.html).toContain('Copa &lt;Oro&gt;');
    expect(message.html).not.toContain('<Oro>');
  });

  it('does not query the directory when every fan already has an email', async () => {
    audience.findAudience.mockResolvedValue([{ id: 1, email: 'ana@example.com' }]);
    await service.notifyAnnotation(annotation);
    expect(directory.findContacts).not.toHaveBeenCalled();
  });

  it('sends the final summary with the score and every annotation', async () => {
    audience.findAudience.mockResolvedValue([{ email: 'ana@example.com' }]);
    await service.notifyMatchSummary(summary);
    const message = mail.send.mock.calls[0][0] as { subject: string; text: string };
    expect(message.subject).toBe('Resultado final: Rojos 2 - 1 Azules');
    expect(message.text).toContain('Fase: Grupos');
    expect(message.text).toContain('min 12: Ana (Rojos)');
    expect(message.text).toContain('Luis (Azules) (2 puntos) - Triple');
  });

  it('says so when there are no annotations', async () => {
    audience.findAudience.mockResolvedValue([{ email: 'ana@example.com' }]);
    await service.notifyMatchSummary({ ...summary, annotations: [] });
    expect((mail.send.mock.calls[0][0] as { text: string }).text).toContain('sin anotaciones registradas');
  });

  it('counts failed deliveries and never throws when a dependency fails', async () => {
    audience.findAudience.mockResolvedValue([{ email: 'a@example.com' }, { email: 'b@example.com' }]);
    mail.send.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('smtp down'));
    await expect(service.notifyAnnotation(annotation)).resolves.toEqual({
      recipients: 2, sent: 1, failed: 1, skipped: false,
    });
    audience.findAudience.mockRejectedValue(new Error('down'));
    await expect(service.notifyMatchSummary(summary)).resolves.toMatchObject({
      sent: 0, reason: 'No fue posible notificar a los aficionados',
    });
  });
});

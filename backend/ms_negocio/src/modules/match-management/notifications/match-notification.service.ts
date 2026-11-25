import { Injectable, Logger } from '@nestjs/common';
import { NotificationSummaryDto } from '../dto/managed-match-response.dto';
import { MatchAttendancesRepository } from '../repositories/match-attendances.repository';
import { FanDirectoryClient } from './fan-directory.client';
import { MailMessage, MailSenderClient } from './mail-sender.client';

export interface MatchCreatedInfo {
  matchId: number;
  tournamentName: string;
  phaseName: string;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  scheduledAt: Date;
  venueName: string | null;
}

const BATCH_SIZE = 10;

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Notifica la creacion de un partido a los aficionados que participaron en partidos anteriores
 * de los equipos enfrentados. Nunca lanza: un fallo de correo no debe deshacer el partido ya creado.
 */
@Injectable()
export class MatchNotificationService {
  private readonly logger = new Logger(MatchNotificationService.name);

  constructor(
    private readonly attendances: MatchAttendancesRepository,
    private readonly directory: FanDirectoryClient,
    private readonly mail: MailSenderClient,
  ) {}

  async notifyMatchCreated(info: MatchCreatedInfo, authorization?: string): Promise<NotificationSummaryDto> {
    if (!this.directory.isConfigured() || !this.mail.isConfigured()) {
      this.logger.warn('Notificacion omitida: directorio de aficionados o MAIL_SERVICE_URL sin configurar');
      return { recipients: 0, sent: 0, failed: 0, skipped: true, reason: 'El envio de correos no esta configurado' };
    }
    try {
      const fanIds = await this.attendances.findFanIdsOfPreviousMatches(
        [info.homeTeamId, info.awayTeamId], info.matchId, info.scheduledAt,
      );
      if (fanIds.length === 0) return { recipients: 0, sent: 0, failed: 0, skipped: false };

      const contacts = await this.directory.findContacts(fanIds, authorization);
      const messages = this.buildMessages(info, contacts.map(contact => ({
        email: contact.email, name: contact.name,
      })));
      let sent = 0;
      let failed = 0;
      for (let index = 0; index < messages.length; index += BATCH_SIZE) {
        const results = await Promise.allSettled(
          messages.slice(index, index + BATCH_SIZE).map(message => this.mail.send(message)),
        );
        for (const result of results) {
          if (result.status === 'fulfilled') sent += 1;
          else failed += 1;
        }
      }
      if (failed > 0) this.logger.warn(`Partido ${info.matchId}: ${failed} correos no se pudieron enviar`);
      return { recipients: messages.length, sent, failed, skipped: false };
    } catch (error: unknown) {
      this.logger.error(
        `Partido ${info.matchId}: no se pudo notificar a los aficionados`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        recipients: 0, sent: 0, failed: 0, skipped: false,
        reason: 'No fue posible notificar a los aficionados',
      };
    }
  }

  private buildMessages(info: MatchCreatedInfo, contacts: { email: string; name?: string }[]): MailMessage[] {
    const date = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'short',
    }).format(info.scheduledAt);
    const title = `${info.homeTeamName} vs ${info.awayTeamName}`;
    const venue = info.venueName ? `Escenario: ${info.venueName}` : 'Escenario: por definir';
    const details = [
      `Torneo: ${info.tournamentName}`, `Fase: ${info.phaseName}`, `Fecha: ${date} (hora de Colombia)`, venue,
    ];
    const seen = new Set<string>();
    const messages: MailMessage[] = [];
    for (const contact of contacts) {
      const key = contact.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const greeting = contact.name ? `Hola ${contact.name},` : 'Hola,';
      const intro = `Se programo un nuevo partido de los equipos que ya has acompanado: ${title}.`;
      messages.push({
        to: contact.email,
        subject: `Nuevo partido: ${title}`,
        text: [greeting, '', intro, '', ...details].join('\n'),
        html: `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(intro)}</p><ul>${
          details.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
      });
    }
    return messages;
  }
}

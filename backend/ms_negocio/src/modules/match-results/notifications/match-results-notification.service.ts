import { Injectable, Logger } from '@nestjs/common';
import { MatchAudienceService } from '../../match-audiences/match-audience.service';
import { NotificationSummaryDto } from '../../match-management/dto/managed-match-response.dto';
import { FanDirectoryClient } from '../../match-management/notifications/fan-directory.client';
import { MailMessage, MailSenderClient } from '../../match-management/notifications/mail-sender.client';

export interface AnnotationLine {
  playerName: string;
  teamName: string;
  minute: number | null;
  points: number;
  description: string | null;
}

export interface AnnotationNotificationInfo extends AnnotationLine {
  matchId: number;
  tournamentName: string;
  homeTeamName: string;
  awayTeamName: string;
}

export interface MatchSummaryInfo {
  matchId: number;
  tournamentName: string;
  phaseName: string;
  homeTeamName: string;
  homeScore: number;
  awayTeamName: string;
  awayScore: number;
  annotations: AnnotationLine[];
}

interface Draft {
  subject: string;
  intro: string;
  details: string[];
}

const BATCH_SIZE = 10;

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const describe = (line: AnnotationLine): string => {
  const minute = line.minute === null ? '' : `min ${line.minute}: `;
  const points = line.points === 1 ? '' : ` (${line.points} puntos)`;
  const note = line.description ? ` - ${line.description}` : '';
  return `${minute}${line.playerName} (${line.teamName})${points}${note}`;
};

/**
 * Notifica a los aficionados con boleto o apuesta sobre el partido: cada anotacion nueva y el resumen
 * final. Nunca lanza: un fallo de correo no debe deshacer lo ya guardado.
 */
@Injectable()
export class MatchResultsNotificationService {
  private readonly logger = new Logger(MatchResultsNotificationService.name);

  constructor(
    private readonly audience: MatchAudienceService,
    private readonly directory: FanDirectoryClient,
    private readonly mail: MailSenderClient,
  ) {}

  notifyAnnotation(info: AnnotationNotificationInfo, authorization?: string): Promise<NotificationSummaryDto> {
    const title = `${info.homeTeamName} vs ${info.awayTeamName}`;
    return this.deliver(info.matchId, {
      subject: `Anotacion en ${title}`,
      intro: `Hubo una anotacion en el partido ${title}.`,
      details: [`Torneo: ${info.tournamentName}`, `Anotacion: ${describe(info)}`],
    }, authorization);
  }

  notifyMatchSummary(info: MatchSummaryInfo, authorization?: string): Promise<NotificationSummaryDto> {
    const score = `${info.homeTeamName} ${info.homeScore} - ${info.awayScore} ${info.awayTeamName}`;
    return this.deliver(info.matchId, {
      subject: `Resultado final: ${score}`,
      intro: `Finalizo el partido: ${score}.`,
      details: [
        `Torneo: ${info.tournamentName}`,
        `Fase: ${info.phaseName}`,
        info.annotations.length === 0
          ? 'Anotaciones: sin anotaciones registradas'
          : 'Anotaciones:',
        ...info.annotations.map(line => `  ${describe(line)}`),
      ],
    }, authorization);
  }

  private async deliver(matchId: number, draft: Draft, authorization?: string): Promise<NotificationSummaryDto> {
    if (!this.mail.isConfigured()) {
      this.logger.warn('Notificacion omitida: MAIL_SERVICE_URL sin configurar');
      return { recipients: 0, sent: 0, failed: 0, skipped: true, reason: 'El envio de correos no esta configurado' };
    }
    try {
      const members = await this.audience.findAudience(matchId);
      const contacts = new Map<string, { email: string; name?: string }>();
      const missingEmail = new Set<number>();
      for (const member of members) {
        if (member.email) {
          const key = member.email.toLowerCase();
          if (!contacts.has(key)) contacts.set(key, { email: member.email, name: member.name });
        } else if (member.id !== undefined) {
          missingEmail.add(member.id);
        }
      }
      if (missingEmail.size > 0 && this.directory.isConfigured()) {
        for (const contact of await this.directory.findContacts([...missingEmail], authorization)) {
          const key = contact.email.toLowerCase();
          if (!contacts.has(key)) contacts.set(key, { email: contact.email, name: contact.name });
        }
      } else if (missingEmail.size > 0) {
        this.logger.warn(`Partido ${matchId}: ${missingEmail.size} aficionados sin correo y sin FAN_DIRECTORY_PATH`);
      }
      const messages = [...contacts.values()].map(contact => this.buildMessage(draft, contact));
      if (messages.length === 0) return { recipients: 0, sent: 0, failed: 0, skipped: false };

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
      if (failed > 0) this.logger.warn(`Partido ${matchId}: ${failed} correos no se pudieron enviar`);
      return { recipients: messages.length, sent, failed, skipped: false };
    } catch (error: unknown) {
      this.logger.error(
        `Partido ${matchId}: no se pudo notificar a los aficionados`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        recipients: 0, sent: 0, failed: 0, skipped: false,
        reason: 'No fue posible notificar a los aficionados',
      };
    }
  }

  private buildMessage(draft: Draft, contact: { email: string; name?: string }): MailMessage {
    const greeting = contact.name ? `Hola ${contact.name},` : 'Hola,';
    return {
      to: contact.email,
      subject: draft.subject,
      text: [greeting, '', draft.intro, '', ...draft.details].join('\n'),
      html: `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(draft.intro)}</p><ul>${
        draft.details.map(line => `<li>${escapeHtml(line.trim())}</li>`).join('')}</ul>`,
    };
  }
}

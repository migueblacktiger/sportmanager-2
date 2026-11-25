import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Puerto de salida de correo por HTTP.
 *
 * Contrato (configurable): POST ${MAIL_SERVICE_URL}
 *   cuerpo:    { "to": "a@b.co", "subject": "...", "text": "...", "html": "..." }
 *   cabecera:  Authorization: Bearer ${MAIL_SERVICE_TOKEN} si esta definido
 *   respuesta: cualquier 2xx es envio correcto.
 * Sin MAIL_SERVICE_URL el adaptador queda desactivado.
 */
@Injectable()
export class MailSenderClient {
  constructor(private readonly config: ConfigService) {}

  private get url(): string | undefined {
    const value = this.config.get<string>('MAIL_SERVICE_URL')?.trim();
    if (!value) return undefined;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  isConfigured(): boolean {
    return this.url !== undefined;
  }

  async send(message: MailMessage): Promise<void> {
    const url = this.url;
    if (!url) throw new Error('MAIL_SERVICE_URL no esta configurada');
    const token = this.config.get<string>('MAIL_SERVICE_TOKEN')?.trim();
    await axios.post(url, message, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: this.config.getOrThrow<number>('SECURITY_TIMEOUT_MS'),
      maxRedirects: 0,
    });
  }
}

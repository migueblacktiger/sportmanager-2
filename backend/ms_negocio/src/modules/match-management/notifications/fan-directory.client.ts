import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface FanContact {
  id: number;
  email: string;
  name?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_BATCH_SIZE = 10;

/**
 * Puerto hacia ms_security, donde se registran los aficionados y se guarda su informacion.
 *
 * Contrato: GET ${MS_SECURITY}${FAN_DIRECTORY_PATH}/{userId}
 * La ruta por defecto es /api/users y se reenvia el Bearer de la peticion original.
 */
@Injectable()
export class FanDirectoryClient {
  constructor(private readonly config: ConfigService) {}

  private get path(): string | undefined {
    const value = this.config.get<string>('FAN_DIRECTORY_PATH')?.trim() || '/api/users';
    const path = value.replace(/\/+$/, '');
    return path.startsWith('/') && path.length > 0 ? path : undefined;
  }

  private get securityUrl(): string | undefined {
    const value = this.config.get<string>('MS_SECURITY')?.trim();
    if (!value) return undefined;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? value.replace(/\/+$/, '') : undefined;
    } catch {
      return undefined;
    }
  }

  isConfigured(): boolean {
    return this.path !== undefined && this.securityUrl !== undefined;
  }

  async findContacts(userIds: number[], authorization?: string): Promise<FanContact[]> {
    const path = this.path;
    const securityUrl = this.securityUrl;
    if (!path || !securityUrl) throw new Error('El directorio de aficionados no esta configurado');
    const uniqueIds = [...new Set(userIds)];
    const contacts: FanContact[] = [];
    for (let index = 0; index < uniqueIds.length; index += REQUEST_BATCH_SIZE) {
      const batch = uniqueIds.slice(index, index + REQUEST_BATCH_SIZE);
      const results = await Promise.all(batch.map(async userId => {
        try {
          const response = await axios.get<unknown>(
            `${securityUrl}${path}/${userId}`,
            {
              headers: authorization ? { Authorization: authorization } : {},
              timeout: this.config.getOrThrow<number>('SECURITY_TIMEOUT_MS'),
              maxRedirects: 0,
            },
          );
          return this.parse(response.data, userId);
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response?.status === 404) return null;
          throw error;
        }
      }));
      contacts.push(...results.filter((contact): contact is FanContact => contact !== null));
    }
    return contacts;
  }

  private parse(data: unknown, expectedId: number): FanContact | null {
    if (typeof data !== 'object' || data === null) return null;
    const { id, email, name } = data as Record<string, unknown>;
    if (id !== expectedId || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) return null;
    return { id: expectedId, email: email.trim(), name: typeof name === 'string' ? name : undefined };
  }
}

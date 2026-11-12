import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import axios from 'axios';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { PermissionValidationRequestDto } from '../dto/permission-validation.dto';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(private readonly config: ConfigService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // No non-HTTP transports are enabled by this initial service.
    if (context.getType() !== 'http') {
      throw new ServiceUnavailableException('Transporte de autorizacion no soportado');
    }
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ])) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization || !/^Bearer [^\s]+$/i.test(authorization)) {
      throw new UnauthorizedException('Bearer token faltante o invalido');
    }
    // Keep the global prefix. Numeric IDs are normalized by ms_security.
    const url = request.path;
    if (url !== '/negocio' && !url.startsWith('/negocio/')) {
      throw new ForbiddenException('Ruta fuera del espacio de negocio');
    }
    const body: PermissionValidationRequestDto = { url, method: request.method };
    let allowed: boolean;
    try {
      const response = await axios.post<unknown>(
        `${this.config.getOrThrow<string>('MS_SECURITY')}/api/internal/security/permissions-validation`,
        body,
        {
          headers: { Authorization: authorization },
          timeout: this.config.getOrThrow<number>('SECURITY_TIMEOUT_MS'),
          maxRedirects: 0,
        },
      );
      const data = response.data;
      if (response.status !== 200 || typeof data !== 'object' || data === null
          || !('allowed' in data) || typeof data.allowed !== 'boolean') {
        throw new Error('Respuesta de seguridad invalida');
      }
      allowed = data.allowed;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new UnauthorizedException('Sesion invalida o expirada');
        }
        if (error.response?.status === 403) {
          throw new ForbiddenException('Operacion no permitida');
        }
      }
      throw new ServiceUnavailableException('No fue posible comprobar los permisos');
    }
    if (!allowed) throw new ForbiddenException('Operacion no permitida');
    return true;
  }
}

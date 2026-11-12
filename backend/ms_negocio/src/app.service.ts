import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { service: string } {
    return { service: 'ms_negocio' };
  }
}

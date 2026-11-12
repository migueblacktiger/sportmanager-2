import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityGuard } from './guards/security.guard';

@Module({ providers: [{ provide: APP_GUARD, useClass: SecurityGuard }] })
export class CommonModule {}

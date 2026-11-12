import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database.config';

@Module({
  imports: [TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      ...databaseOptions({
        DB_HOST: config.getOrThrow('DB_HOST'),
        DB_PORT: config.getOrThrow('DB_PORT'),
        DB_USERNAME: config.getOrThrow('DB_USERNAME'),
        DB_PASSWORD: config.getOrThrow('DB_PASSWORD'),
        DB_DATABASE: config.getOrThrow('DB_DATABASE'),
      }),
      autoLoadEntities: true,
    }),
  })],
})
export class DatabaseModule {}

import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export function databaseOptions(env: Record<string, unknown>): DataSourceOptions {
  return {
    type: 'mysql',
    host: String(env.DB_HOST),
    port: Number(env.DB_PORT),
    username: String(env.DB_USERNAME),
    password: String(env.DB_PASSWORD),
    database: String(env.DB_DATABASE),
    entities: [join(__dirname, '..', '**', 'entities', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}

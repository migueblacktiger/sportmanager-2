import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './src/config/database.config';
import { validateEnvironment } from './src/config/environment';

export default new DataSource(databaseOptions(validateEnvironment(process.env)));

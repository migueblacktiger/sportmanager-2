import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database.module';
import { validateEnvironment } from './config/environment';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './modules/sports/sports.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TeamSportsModule } from './modules/team-sports/team-sports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    CommonModule,
    SportsModule,
    TeamsModule,
    TeamSportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

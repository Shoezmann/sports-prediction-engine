import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationModule } from '../application/application.module';
import {
  SportsController,
  GamesController,
  PredictionsController,
  ResultsController,
  AccuracyController,
  HealthController,
  AuthController,
  BetsController,
  StreamController,
} from '../api/controllers/api.controllers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ApplicationModule,
  ],
  controllers: [
    SportsController,
    GamesController,
    PredictionsController,
    ResultsController,
    AccuracyController,
    HealthController,
    AuthController,
    BetsController,
    StreamController,
  ],
})
export class AppModule { }

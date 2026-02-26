import './polyfill';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend dev server
  app.enableCors({
    origin: ['http://localhost:4200'],
    credentials: true,
  });

  const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Sports Prediction Engine API running on http://localhost:${port}/api`,
  );
}

bootstrap();

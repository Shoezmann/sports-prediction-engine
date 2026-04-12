import './polyfill';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend dev server
  app.enableCors({
    origin: ['http://localhost:4200'],
    credentials: true,
  });

  // Enable global validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Setup Swagger documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Sports Prediction Engine API')
      .setDescription('API documentation for the Sports Prediction Engine')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('sports', 'Sport synchronization')
      .addTag('games', 'Game synchronization')
      .addTag('predictions', 'Prediction generation and retrieval')
      .addTag('results', 'Result updates and backfilling')
      .addTag('accuracy', 'Prediction accuracy metrics')
      .addTag('bets', 'Bet placement and tracking (auth required)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Sports Prediction Engine API',
    });

    Logger.log(`📚 Swagger docs available at http://localhost:${process.env.BACKEND_PORT || 3000}/api/docs`);
  }

  const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Sports Prediction Engine API running on http://localhost:${port}/api`,
  );
}

bootstrap();

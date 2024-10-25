import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { BullMonitorExpress } from '@bull-monitor/express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { BullAdapter } from '@bull-monitor/root/dist/bull-adapter';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
const path = require('path');
// const Queue = require('bull');
// const basicAuth = require('express-basic-auth');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(
    '/.well-known',
    express.static(path.join(__dirname, '..', '.well-known')),
  );

  const swaggerOption = new DocumentBuilder()
    .setTitle('Job Portal API')
    .setDescription('Job Portal API description ')
    .setVersion('1.0')
    .addTag('Job Portal')
    .setExternalDoc('Json Collection', '/api-json')
    .addBearerAuth()
    .build();

  //Bull Monitor
  //https://github.com/s-r-x/bull-monitor/tree/main/packages/express#usage

  const bullOptions = {
    redis: {
      port: process.env.QUEUE_PORT || 6379,
      host: process.env.QUEUE_HOST || 'localhost',
    },
    settings: {
      lockDuration: 30,
      maxStalledCount: 1,
    },
  };

  const document = SwaggerModule.createDocument(app, swaggerOption);
  SwaggerModule.setup('api', app, document);

  await app.listen(8000);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyMulipart from 'fastify-multipart';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';

async function bootstrap() {
  dotenv.config();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableShutdownHooks();
  await app.register(fastifyMulipart);
  app.enableCors();

  await app.listen(3050, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${3050}`);
  });
}

bootstrap().then((r) => console.log(r));

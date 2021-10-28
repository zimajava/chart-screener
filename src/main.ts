import { NestFactory } from '@nestjs/core';
import { ConsoleLogger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

const PORT = process.env.PORT || 3050;
const logger = new ConsoleLogger();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true })).catch(
    (err) => {
      logger.error('err in creating adapter', err);
      process.exit(1);
    },
  );

  await app.listen(PORT, '0.0.0.0', () => {
    if (process.env.NODE_ENV === 'development') {
      logger.log(`Server listening at http://0.0.0.0:${PORT}`);
      // logger.log(`Swagger listening in: http://localhost:${process.env.PORT || 3000}/docs`);
    }
  });
}

bootstrap();

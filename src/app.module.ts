import { Module } from '@nestjs/common';
import { ConfigModule /*, ConfigService*/ } from '@nestjs/config';
// import { BullModule } from '@nestjs/bull';
// import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from '@hapi/joi';

import { WSService } from './services/socket-service/socket-client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import HealthModule from './modules/health/health.module';

@Module({
  imports: [
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     redis: {
    //       host: configService.get('REDIS_HOST'),
    //       port: Number(configService.get('REDIS_PORT')),
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),
    // ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        // PORT: Joi.number(),
        WSS_URL: Joi.string().required(),
        QUOTATION_URL: Joi.string().required(),
      }),
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, WSService],
})
export class AppModule {}

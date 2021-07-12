import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WSService } from './socket-client';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, WSService],
})
export class AppModule {}

import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

import { AppService } from './app.service';

type Request = FastifyRequest;
type Response = FastifyReply;

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(':tid/:assetName/:timeframe')
  async getChart(
    @Param('tid') tid,
    @Param('assetName') assetName,
    @Param('timeframe') timeframe,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.appService.getChart(
      tid,
      assetName,
      timeframe,
      request,
      response,
    );
  }
}

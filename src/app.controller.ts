import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

import { AppService } from './app.service';
import { WSService } from './socket-client';

type Request = FastifyRequest;
type Response = FastifyReply;

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly wsService: WSService) {}

  @Get(':tid/:assetName/:timeframe')
  async getChart(
    @Param('tid') tid,
    @Param('assetName') assetName,
    @Param('timeframe') timeframe,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    // const qwe = {
    //   module: 'history',
    //   cmd: 'bars',
    //   args: {
    //     period: 'Minute',
    //     id: '23',
    //     count: 100,
    //     withCurrentBar: true,
    //   },
    // };
    // await this.wsService.send(JSON.stringify(qwe));
    // await this.wsService.onMessage((data) => {
    //   if (typeof data === 'string') {
    //     let message;
    //     try {
    //       message = JSON.parse(data);
    //     } catch (e) {
    //       console.error('Error parse MESSAGE', e);
    //     }
    //
    //     // const args = Array.isArray(message.args) ? message.args[0] : 'message.args[0] NOT ARR';
    //
    //     console.log('HISTORY', message.module, message.cmd);
    //   }
    // });
    await this.appService.getChart(tid, assetName, timeframe, request, response);
  }
}

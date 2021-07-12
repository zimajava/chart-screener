import * as fs from 'fs';
import * as path from 'path';
import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

import { AppService } from './app.service';
import { WSService } from './socket-client';

type Request = FastifyRequest;
type Response = FastifyReply;

interface InstrumentSetting {
  ID: number;
  market: string;
  name: string;
  seoName: string;
  priceRounding: number;
  leverage: number;
  defaultQuantity: number;
  maximumQuantity: number;
  minimumQuantity: number;
  quantityIncrement: number;
  tickSize: number;
  popular: boolean;
  termCurrency: string;
  baseCurrency: string;
  keyName: string;
}

function resolve(p: string) {
  return path.resolve(process.cwd(), p);
}

function getServerPeriod(value) {
  switch (value) {
    case '1':
      return 'Minute';
    case '5':
      return 'Minute5';
    case '15':
      return 'Minute15';
    case '30':
      return 'Minute30';
    case '60':
      return 'Hour';
    case 'hour4':
      return 'Hour4';
    case 'hour8':
      return 'Hour8';
    case 'day':
      return 'Day';
    case 'week':
      return 'Week';
    case 'month':
      return 'Month';
    default:
      return 'Minute';
  }
}

@Controller()
export class AppController {
  private settings: Record<string, InstrumentSetting>;

  constructor(private readonly appService: AppService, private readonly wsService: WSService) {
    const settingsJson = fs.readFileSync(resolve('data/settings2.json'), {
      encoding: 'utf8',
    });
    this.settings = JSON.parse(settingsJson);
  }

  @Get(':tid/:assetName/:timeframe')
  async getChart(
    @Param('tid') tid,
    @Param('assetName') assetName,
    @Param('timeframe') timeframe,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const pair = this.settings[assetName];
    const period = getServerPeriod(timeframe);

    console.log('tid =>', tid, '| pair =>', JSON.stringify(pair), '| timeframe =>', period);
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
    await this.appService.getChart(pair, period, timeframe, request, response);
  }
}

import * as fs from 'fs';
import { Controller, Get, Param, Req, Res } from '@nestjs/common';

import { AppService } from './app.service';
import { resolve, getServerPeriod } from './utils';
import { Request, Response, InstrumentSetting } from './types';

@Controller()
export class AppController {
  private readonly settings: Record<string, InstrumentSetting>;

  constructor(private readonly appService: AppService) {
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

    // console.log('tid =>', tid, '| pair =>', JSON.stringify(pair), '| timeframe =>', period);

    await this.appService.getChart(pair, period, timeframe, request, response);
  }
}

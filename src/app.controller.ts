import * as fs from 'fs';
import { Controller, Get, Header, Param, Req, Res } from '@nestjs/common';

import { AppService } from './app.service';
import { resolve, getServerPeriod } from './utils/utils';
import { Request, Response, InstrumentSetting } from './types';

@Controller()
export class AppController {
  private readonly settingsByName: Record<string, InstrumentSetting>;

  private readonly settingsByID: Record<string, InstrumentSetting>;

  constructor(private readonly appService: AppService) {
    const settingsByNameJson = fs.readFileSync(resolve('data/settingsByName.json'), {
      encoding: 'utf8',
    });
    this.settingsByName = JSON.parse(settingsByNameJson);

    const settingsByIDJson = fs.readFileSync(resolve('data/settingsByID.json'), {
      encoding: 'utf8',
    });
    this.settingsByID = JSON.parse(settingsByIDJson);
  }

  @Get(':tid/:asset/:timeframe')
  @Header('Cache-Control', 'max-age=31536000, public')
  async getChart(
    @Param('tid') tid,
    @Param('asset') asset,
    @Param('timeframe') timeframe,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const pair = Number.isNaN(parseInt(asset, 10)) ? this.settingsByName[asset] : this.settingsByID[asset];
    const period = getServerPeriod(timeframe);

    await this.appService.getChart(pair, period, timeframe, request, response);
  }
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JSDOM } from 'jsdom';
// @ts-ignore
import * as an from 'anychart';
import axios from 'axios';

import { AnychartExport } from './AnychartExport';
import { darkBlueTheme } from './dark-blue-theme';

type Request = FastifyRequest;
type Response = FastifyReply;

const TICK_COUNTS = 5;

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

function getUIPeriod(value) {
  switch (value) {
    case '1':
      return '1 minute';
    case '5':
      return '5 minutes';
    case '15':
      return '15 minutes';
    case '30':
      return '30 minutes';
    case '60':
      return '1 hour';
    case 'hour4':
      return '4 hours';
    case 'hour8':
      return '8 hours';
    case 'day':
      return '1 day';
    case 'week':
      return '1 week';
    case 'month':
      return '1 month';
    default:
      return 'Minute';
  }
}

function getTickSetting(unit, numberOfUnitsInCandle, rangeLimit) {
  const count = (rangeLimit * numberOfUnitsInCandle) / TICK_COUNTS;
  const setting = { unit, count: Math.round(count) };
  return [{ minor: setting, major: setting }];
}

function tickMapping(period, rangeLimit) {
  switch (period) {
    case '1': {
      return getTickSetting('minute', 1, rangeLimit);
    }
    case '5': {
      return getTickSetting('minute', 5, rangeLimit);
    }
    case '15': {
      return getTickSetting('minute', 15, rangeLimit);
    }
    case '30': {
      return getTickSetting('minute', 30, rangeLimit);
    }
    case '60': {
      return getTickSetting('hour', 1, rangeLimit);
    }
    case 'hour4': {
      return getTickSetting('hour', 4, rangeLimit);
    }
    case 'hour8': {
      return getTickSetting('hour', 8, rangeLimit);
    }
    case 'day': {
      return getTickSetting('day', 1, rangeLimit);
    }
    case 'week': {
      return getTickSetting('week', 1, rangeLimit);
    }
    case 'month': {
      return getTickSetting('month', 1, rangeLimit);
    }
    default: {
      return getTickSetting('minute', 1, rangeLimit);
    }
  }
}

@Injectable()
export class AppService {
  async getChart(
    tid: string,
    assetName: string,
    timeframe: string,
    request: Request,
    response: Response,
  ): Promise<void> {
    console.time('Completed');

    const settingsJson = fs.readFileSync(resolve('data/settings2.json'), {
      encoding: 'utf8',
    });
    const settings = JSON.parse(settingsJson);

    const pair = settings[assetName];
    const period = getServerPeriod(timeframe);

    console.log('tid =>', tid, '| pair =>', JSON.stringify(pair), '| timeframe =>', period);

    let rawData = [];
    try {
      const { data } = await axios.get(`${process.env.QUOTATION_URL}/${pair.ID}/${period}/500/?withCurrentBar=true`);
      const parsedData = JSON.parse(data);

      rawData = parsedData.map(({ T, O, H, C, L }) => {
        const time = T * 1000;
        return [time, O, H, L, C];
      });
    } catch (e) {
      console.error(e);
    }

    const candlesCount = rawData.length;
    const rangeLimit = candlesCount <= 80 ? candlesCount : 80;

    const { window } = new JSDOM('<body><div id="container"></div></body>', {
      runScripts: 'dangerously',
      url: 'https://localhost',
    });

    darkBlueTheme(window);

    const anychart: an = an(window);
    const anychartExport = AnychartExport.getInstance(anychart, window);

    anychart.theme(window.anychart.themes.darkBlue);

    const dataTable = anychart.data.table();
    dataTable.addData(rawData);

    const mapping = dataTable.mapAs({ open: 1, high: 2, low: 3, close: 4, value: 4 });

    const chart = anychart.stock();
    chart.padding(20, 70, 20, 20);

    const scale = chart.xScale();
    const tickSetting = tickMapping(timeframe, rangeLimit);
    scale.ticks(tickSetting);

    // Set minimum gap
    // scale.minimumGap({ intervalsCount: 10, unitType: 'minute', unitCount: 1 });
    // Set maximum gap
    // scale.maximumGap({ intervalsCount: 15, unitType: 'minute', unitCount: 1 });

    // create first plot on the chart
    const plot = chart.plot(0);
    plot.yGrid(true).xGrid(true).yMinorGrid(false).xMinorGrid(true);
    plot.legend().title().enabled(false);

    const plotXAxis = plot.xAxis();
    plot.yAxis(0).orientation('right');
    plotXAxis.height(40);
    plotXAxis.labels().format(function () {
      return anychart.format.dateTime(this.tickValue, 'MMM/dd \n hh:mm a');
    });
    // .background('lightgray');

    const indicator = plot.priceIndicator();
    indicator
      .value('last-visible')
      .fallingStroke('#F44336')
      .fallingLabel({ background: '#F44336' })
      .risingStroke('#4CAF50')
      .risingLabel({ background: '#4CAF50' });

    const series = plot.candlestick(mapping);
    series.risingStroke('#4CAF50').risingFill('#4CAF50').fallingStroke('#F44336').fallingFill('#F44336');
    series.legendItem().iconType('rising-falling');

    if (rawData.length) {
      const rangeLimitIndex = rangeLimit - 1;
      chart.selectRange(rawData[0][0], rawData[rangeLimitIndex][0]);
    }

    const scroller = chart.scroller();
    // scroller.enabled(false);
    scroller
      .selectedFill('green 0.3')
      .allowRangeChange(false)
      .area(mapping);

    // chart.bounds(0, 0, 800, 600);
    chart.bounds(0, 0, 1280, 1024);

    const pairName = pair.baseCurrency === 'XXX' ? `${pair.name}/${pair.termCurrency}` : pair.name;
    chart.title(`${pairName} \n Timeframe: ${getUIPeriod(timeframe)}`);
    chart.container('container');
    chart.draw();
    try {
      const picture = await anychartExport.exportTo(chart, {
        outputType: 'png',
        quality: 100,
        document: window.document,
        // resources: [
        //   'https://cdn.anychart.com/releases/v8/css/anychart-ui.min.css',
        //   'https://cdn.anychart.com/releases/v8/fonts/css/anychart-font.min.css',
        // ],
      });
      response.status(200);
      response.headers({ 'Content-type': 'image/png' });
      response.send(picture);
    } catch (e) {
      console.error(e);
      response.status(500);
      response.send(`Screenshot not available`);
    }
    console.timeEnd('Completed');
  }
}

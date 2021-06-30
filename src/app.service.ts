/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JSDOM } from 'jsdom';
// @ts-ignore
import * as an from 'anychart';
import axios from 'axios';

// @ts-ignore
import { AnychartExportWrapper } from './anychart-node';

type Request = FastifyRequest;
type Response = FastifyReply;

const resolve = (p: string) => path.resolve(process.cwd(), p);

const getServerPeriod = (value) => {
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
    case 'minute':
      return 'Minute';
    case 'minute5':
      return 'Minute5';
    case 'minute15':
      return 'Minute15';
    case 'minute30':
      return 'Minute30';
    case 'hour':
      return 'Hour';
    default:
      return 'Minute';
  }
};

@Injectable()
export class AppService {
  async getChart(
    tid: string,
    assetName: string,
    timeframe: string,
    request: Request,
    response: Response,
  ): Promise<void> {
    const start = Date.now();

    const settingsJson = fs.readFileSync(resolve('data/settings.json'), {
      encoding: 'utf8',
    });
    const settings = JSON.parse(settingsJson);

    const jsdom = new JSDOM('<body><div id="container"></div></body>', {
      runScripts: 'dangerously',
    });

    const anychart = an(jsdom.window);
    const anychartExport = AnychartExportWrapper(anychart);

    const pair = settings[assetName];

    const period = getServerPeriod(timeframe);

    // eslint-disable-next-line prettier/prettier
    console.log('tid =>', tid, '| pair =>', JSON.stringify(pair), '| timeframe =>', period);

    let rawData;
    try {
      const { data } = await axios.get(
        `${process.env.QUOTATION_URL}/${pair.ID}/${period}/1000/?withCurrentBar=true`,
      );
      rawData = JSON.parse(data);
    } catch (e) {
      console.error(e);
    }

    // create data table on loaded data
    const dataTable = anychart.data.table('T');
    dataTable.addData(rawData);

    // map the data
    const mapping = dataTable.mapAs({
      open: 'O',
      high: 'H',
      low: 'L',
      close: 'C',
    });

    // create stock chart
    const chart = anychart.stock();

    // create first plot on the chart
    const plot = chart.plot(0);
    // set grid settings
    plot.yGrid(true).xGrid(true).yMinorGrid(true).xMinorGrid(true);

    // set the series
    const series = plot.candlestick(mapping);

    series.risingStroke('#336666');
    series.risingFill('#339999');
    series.fallingStroke('#660000');
    series.fallingFill('#990033');
    // series.pointWidth(10);

    chart.scroller().enabled(false);

    // series.name("ACME Corp. stock prices");
    // chart.title('Stock Candlestick Demo: ACME Corp. Stock prices');
    chart.bounds(0, 0, 800, 600);
    chart.container('container');
    chart.draw();

    try {
      // generate JPG image and save it to a file
      const picture = await anychartExport.exportTo(chart, 'jpg');

      response.status(200);
      response.headers({ 'Content-type': 'image/jpg' });
      response.send(picture);
    } catch (e) {
      console.error(e);
      response.status(500);
      response.send(`Screenshot not available`);
    }
    console.log(`Completed (${Date.now() - start} ms)`);
  }
}

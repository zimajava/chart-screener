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
// import { darkTurquoiseTheme } from './dark-turquoise-theme';
import { darkBlueTheme } from './dark-blue-theme';

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

    const window = jsdom.window;
    const doc = window.document;

    const mainCss = fs.readFileSync(path.resolve(process.cwd(), 'css/anychart-ui.css'), 'utf8');
    const head = doc.getElementsByTagName('head')[0];
    const style = doc.createElement('style');
    style.type = 'text/css';
    style.innerHTML = mainCss;
    head.appendChild(style);

    // darkTurquoiseTheme(window);
    const anychart = an(window);
    darkBlueTheme(window);
    const anychartExport = AnychartExportWrapper(anychart);

    const pair = settings[assetName];

    const period = getServerPeriod(timeframe);

    // eslint-disable-next-line prettier/prettier
    console.log('tid =>', tid, '| pair =>', JSON.stringify(pair), '| timeframe =>', period);

    let rawData;
    try {
      const { data } = await axios.get(`${process.env.QUOTATION_URL}/${pair.ID}/${period}/1000/?withCurrentBar=true`);
      rawData = JSON.parse(data);
    } catch (e) {
      console.error(e);
    }

    const data = rawData.map(({ T, O, H, C, L }) => {
      const time = T * 1000;
      return [time, O, H, L, C];
    });

    // apply coffee theme
    // anychart.theme(window.anychart.themes.darkTurquoise);
    // anychart.theme(window.anychart.themes.darkBlue);

    // create data table on loaded data
    const dataTable = anychart.data.table();
    dataTable.addData(data);

    const mapping = dataTable.mapAs();
    mapping.addField('open', 1, 'first');
    mapping.addField('high', 2, 'max');
    mapping.addField('low', 3, 'min');
    mapping.addField('close', 4, 'last');
    mapping.addField('value', 4, 'last');

    // create stock chart
    const chart = anychart.stock();
    chart.padding(20, 70, 20, 20);

    const grouping = chart.grouping();
    // Set maximum visible points count.
    grouping.maxVisiblePoints(80);
    chart.scrollerGrouping({ maxVisiblePoints: 80 });

    // const dateTimeScale = anychart.scales.dateTime();
    // const ticks = dateTimeScale.ticks();
    // // Set interval for ticks.
    // ticks.interval('day', 5);
    // chart.xScale(dateTimeScale);

    // const scale = chart.xScale();
    // // // Set minimum gap
    // scale.minimumGap({ intervalsCount: 20, unitType: 'minute', unitCount: 1 });
    // // // Set maximum gap
    // scale.maximumGap({ intervalsCount: 15, unitType: 'minute', unitCount: 1 });
    // // Set ticks.
    // scale.ticks([{ minor: 'minute', major: 'minute' }]);

    // create first plot on the chart
    const plot = chart.plot(0);
    // set grid settings
    plot.yGrid(true).xGrid(true);
    plot.yAxis(0).orientation('right');

    const indicator = plot.priceIndicator();
    indicator.value('last-visible');
    indicator.fallingStroke('#F44336');
    indicator.fallingLabel({ background: '#F44336' });
    indicator.risingStroke('#4CAF50');
    indicator.risingLabel({ background: '#4CAF50' });

    const series = plot.candlestick(mapping);

    series.risingStroke('#4CAF50');
    series.risingFill('#4CAF50');
    series.fallingStroke('#F44336');
    series.fallingFill('#F44336');

    // chart.selectRange(data[0][0], data[79][0]);
    const scroller = chart.scroller();
    scroller.line(mapping);

    chart.bounds(0, 0, 1024, 768);
    chart.container('container');
    chart.draw();

    try {
      const picture = await anychartExport.exportTo(chart, 'png');
      response.status(200);
      response.headers({ 'Content-type': 'image/png' });
      response.send(picture);
    } catch (e) {
      console.error(e);
      response.status(500);
      response.send(`Screenshot not available`);
    }
    console.log(`Completed (${Date.now() - start} ms)`);
  }
}

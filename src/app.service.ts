/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
// @ts-ignore
import * as an from 'anychart';

import { AnychartExport } from './AnychartExport';
import { darkBlueTheme } from './dark-blue-theme';
import { WSService } from './socket-client';
import { tickMapping, getUIPeriod } from './utils';
import { Request, Response, InstrumentSetting } from './types';

@Injectable()
export class AppService {
  constructor(private readonly wsService: WSService) {}

  async getChart(
    pair: InstrumentSetting,
    period: string,
    timeframe: string,
    request: Request,
    response: Response,
  ): Promise<void> {
    const args = {
      module: 'history',
      cmd: 'bars',
      args: { period, id: String(pair.ID), count: 500, withCurrentBar: true },
    };

    function handleWsMessage(ws) {
      const func = async function handler(data) {
        let message;

        if (typeof data === 'string') {
          try {
            message = JSON.parse(data);
          } catch (e) {
            console.error('Error parse MESSAGE', e);
          }

          if (message.module === 'history' && message.args.barType === period && message.args.id === pair.ID) {
            // console.log(`${request.id} ${pair.name}/${period} Started`);
            const timerName = `${request.id} ${pair.name}/${period} Completed`;
            console.time(timerName);

            const isBarsExist =
              typeof message.args === 'object' && message.args.bars && Array.isArray(message.args.bars);

            // console.log(omit(['bars'], message.args));

            const bars = isBarsExist ? message.args.bars : [];

            const mappedBars = bars.map(
              ({ /*closeAsk, highAsk, lowAsk, openAsk, */ closeBid, highBid, lowBid, openBid, time }) => {
                const T = time * 1000;
                return [T, openBid, highBid, lowBid, closeBid];
              },
            );

            const candlesCount = mappedBars.length;
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
            dataTable.addData(mappedBars);

            const mapping = dataTable.mapAs({ open: 1, high: 2, low: 3, close: 4, value: 4 });

            const chart = anychart.stock();
            chart.padding(20, 80, 20, 20);

            chart.crosshair().displayMode('sticky').enabled();

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

            const plotYAxis = plot.yAxis(0);
            plotYAxis.labels().fontSize(14);
            plotYAxis.orientation('right');

            const plotXAxis = plot.xAxis();
            plotXAxis.height(50);
            plotXAxis
              .labels()
              .hAlign('center')
              .fontSize(14)
              .format(function () {
                return anychart.format.dateTime(this.tickValue, 'hh:mm a \n MMM/dd');
              });
            // .background('#78909c');

            const indicator = plot.priceIndicator();
            indicator
              .value('last-visible')
              .fallingStroke('#F44336')
              .fallingLabel({ background: '#F44336' })
              .risingStroke('#4CAF50')
              .risingLabel({ background: '#4CAF50' })
              .label()
              .fontSize(14)
              .fontColor('white');

            const series = plot.candlestick(mapping);
            series.risingStroke('#4CAF50').risingFill('#4CAF50').fallingStroke('#F44336').fallingFill('#F44336');
            series.legendItem().fontSize(14).iconType('rising-falling');
            // series.right(100);

            if (mappedBars.length) {
              const rangeLimitIndex = rangeLimit - 1;
              chart.selectRange(mappedBars[0][0], mappedBars[rangeLimitIndex][0]);
            }

            const scroller = chart.scroller();
            // scroller.enabled(false);
            scroller.selectedFill('green 0.3').allowRangeChange(false).area(mapping);

            chart.bounds(0, 0, 800, 600);
            // chart.bounds(0, 0, 1280, 1024);

            const pairName = pair.baseCurrency === 'XXX' ? `${pair.name}/${pair.termCurrency}` : pair.name;
            chart.title(`${pairName} \n Timeframe: ${getUIPeriod(timeframe)}`);
            chart.container('container');
            chart.draw();

            try {
              const picture = await anychartExport.exportTo(chart, {
                outputType: 'png',
                quality: 100,
                document: window.document,
              });
              response.status(200);
              response.headers({ 'Content-type': 'image/png' });
              response.send(picture);
            } catch (e) {
              console.error(e);
              response.status(500);
              response.send(`Screenshot not available`);
            }

            console.timeEnd(timerName);
          }
        }

        if (message.module === 'history' && message.args.barType === period && message.args.id === pair.ID) {
          // console.log('ws.off', func.name);
          ws.off('message', func);
          // console.log('ws.off', ws._events.message);
        }
      };

      const funcName = `${String(request.id).replace('-', '_')}_handler`;
      Object.defineProperty(func, 'name', { value: funcName, writable: false });

      ws.on('message', func);
      // console.log('ws.on', ws._events.message);
    }

    this.wsService.onMessage(handleWsMessage);

    this.wsService.send(JSON.stringify(args));

    // const mappedBars = [];
    // try {
    //   const { data } = await axios.get(`${process.env.QUOTATION_URL}/${pair.ID}/${period}/300/?withCurrentBar=true`);
    //   const parsedData = JSON.parse(data);
    //
    //   mappedBars = parsedData.map(({ T, O, H, C, L }) => {
    //     const time = T * 1000;
    //     return [time, O, H, L, C];
    //   });
    // } catch (e) {
    //   console.error(e);
    // }
  }
}

import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import axios from 'axios';

@Injectable()
export class WSService {
  // wss://echo.websocket.org is a test websocket server
  private ws: WebSocket;

  constructor() {
    this.getConnectionSettings().then((serverName) => {
      const wsUrl = `wss://${serverName}.investforum.ru/wss/Server.ashx?subscriber=true`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('SOCKET OPENED');
      });

      this.ws.on('error', (e) => {
        console.log('SOCKET ERROR', e);
      });
      this.ws.on('close', () => {
        console.log('SOCKET CLOSED');
      });
      this.ws.on('message', function (data) {
        if (typeof data === 'string') {
          let message;
          try {
            message = JSON.parse(data);
          } catch (e) {
            console.error('Error parse MESSAGE', e);
          }

          // const args = Array.isArray(message.args) ? message.args[0] : 'message.args[0] NOT ARR';

          // console.log(message.module, message.cmd);
        }
      });
    });
  }

  getConnectionSettings = (): Promise<string> => {
    const url = 'https://informer.investforum.ru/wss/Server.ashx?command=getConnectingStr';

    return axios
      .get(url)
      .then((res) => {
        if (res.status !== 200) {
          const error = new Error(res.statusText);
          // @ts-ignore
          error.res = res;
          throw error;
        }

        return res.data;
      })
      .catch((e) => {
        console.warn(e);
      });
  };

  send(data: any) {
    this.ws.send(data);
  }

  onMessage(handler: (data) => void) {
    this.ws.on('message', handler);
    // this.ws.off('message', handler);
  }
}

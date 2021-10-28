import { Injectable, ConsoleLogger } from '@nestjs/common';
import * as WebSocket from 'ws';
import axios from 'axios';

const logger = new ConsoleLogger();

function getConnectionSettings(): Promise<string | void> {
  const url = `${process.env.WSS_URL}?command=getConnectingStr`;

  return axios
    .get<string>(url)
    .then((res) => {
      if (res.status !== 200) {
        const error = new Error(res.statusText);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        error.res = res;
        throw error;
      }

      return res.data;
    })
    .catch((e) => {
      logger.error(e);
    });
}

@Injectable()
export class WSService {
  private ws: WebSocket;

  constructor() {
    getConnectionSettings().then((serverName) => {
      this.init(serverName);
    });
  }

  init(serverName) {
    const wsUrl = `${process.env.WSS_URL.replace('informer', serverName)}?subscriber=true`;

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      logger.log('SOCKET OPENED');
    });

    this.ws.on('error', (e) => {
      logger.log('SOCKET ERROR', e);
    });

    this.ws.on('close', () => {
      logger.log('SOCKET CLOSED');
      getConnectionSettings().then((serverName) => {
        logger.log('RETRY OPEN');
        this.init(serverName);
      });
    });
  }

  send(data: any) {
    this.ws.send(data);
  }

  onMessage(handler: (ws: WebSocket) => void) {
    handler(this.ws);
  }
}

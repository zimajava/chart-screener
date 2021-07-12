import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import axios from 'axios';

function getConnectionSettings(): Promise<string> {
  const url = `${process.env.WSS_URL}?command=getConnectingStr`;

  return axios
    .get(url)
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
      console.warn(e);
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
      console.log('SOCKET OPENED');
    });

    this.ws.on('error', (e) => {
      console.log('SOCKET ERROR', e);
    });

    this.ws.on('close', () => {
      console.log('SOCKET CLOSED');
      getConnectionSettings().then((serverName) => {
        console.log('RETRY OPEN');
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

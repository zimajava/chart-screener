import { FastifyReply, FastifyRequest } from 'fastify';

export type Request = FastifyRequest;
export type Response = FastifyReply;

export interface InstrumentSetting {
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

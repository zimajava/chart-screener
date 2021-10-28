import * as path from 'path';

export function resolve(p: string) {
  return path.resolve(process.cwd(), p);
}

export function getServerPeriod(value) {
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

const TICK_COUNTS = 5;

export function getUIPeriod(value) {
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

export function getTickSetting(unit, numberOfUnitsInCandle, rangeLimit) {
  const count = (rangeLimit * numberOfUnitsInCandle) / TICK_COUNTS;
  const setting = { unit, count: Math.round(count) };
  return [{ minor: setting, major: setting }];
}

export function tickMapping(period, rangeLimit) {
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

import { Injectable } from '@angular/core';

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

@Injectable({
  providedIn: 'root'
})
export class IndicatorsService {
  calculateEMA(candles: Candle[], period: number): { x: Date; y: number }[] {
    if (candles.length < period) return [];
    const k = 2 / (period + 1);
    let ema = candles[0].c;
    return candles.map(c => {
      ema = c.c * k + ema * (1 - k);
      return { x: new Date(c.t * 1000), y: ema };
    });
  }

  calculateRSI(candles: Candle[], period: number = 14): { x: Date; y: number }[] {
    if (candles.length < period) return [];
    const rsiData: { x: Date; y: number }[] = [];
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = candles[i].c - candles[i - 1].c;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < candles.length; i++) {
      const diff = candles[i].c - candles[i - 1].c;
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - diff) / period;
      }

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      rsiData.push({ x: new Date(candles[i].t * 1000), y: rsi });
    }

    return rsiData;
  }

  calculateMACD(candles: Candle[], fast: number = 12, slow: number = 26, signal: number = 9) {
    const emaFast = this.calculateEMA(candles, fast).map(e => e.y);
    const emaSlow = this.calculateEMA(candles, slow).map(e => e.y);

    const macdLine: number[] = [];
    for (let i = 0; i < emaSlow.length; i++) {
      if (emaFast[i + (slow - fast)] !== undefined) {
        macdLine.push(emaFast[i + (slow - fast)] - emaSlow[i]);
      }
    }

    const signalLine: number[] = [];
    let k = 2 / (signal + 1);
    let emaSig = macdLine[0];
    for (let i = 0; i < macdLine.length; i++) {
      emaSig = macdLine[i] * k + emaSig * (1 - k);
      signalLine.push(emaSig);
    }

    const histogram = macdLine.map((m, i) => m - signalLine[i]);

    return { macdLine, signalLine, histogram };
  }
}

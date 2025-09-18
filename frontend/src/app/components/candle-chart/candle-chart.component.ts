import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ChartComponent,
  NgApexchartsModule,
  ApexOptions
} from 'ng-apexcharts';
import { CandleService, Candle } from '../../services/candle.service';

@Component({
  selector: 'app-candle-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './candle-chart.component.html',
  styleUrls: ['./candle-chart.component.scss']
})
export class CandleChartComponent implements OnInit, OnDestroy {
  @Input() symbol: string = 'BTCUSDT';
  @Input() mode: 'main' | 'volume' | 'rsi' | 'macd' = 'main';

  @ViewChild('chart') chart!: ChartComponent;

  candles: Candle[] = [];

  chartOptions: Partial<ApexOptions> = {};
  series: any[] = [];

  private subscription: any;

  constructor(private candleService: CandleService) {}

  ngOnInit() {
    this.subscription = this.candleService.connect(this.symbol).subscribe((c: Candle) => {
      const idx = this.candles.findIndex(x => x.t === c.t);
      if (idx >= 0) this.candles[idx] = c;
      else this.candles.push(c);

      // ✅ massimo 50 candele
      this.candles = this.candles.slice(-50);

      this.updateChart();
    });
  }

  ngOnDestroy() {
    this.candleService.disconnect();
    if (this.subscription) this.subscription.unsubscribe();
  }

  private updateChart() {
  if (this.mode === 'main') {
    // Serie candele
    const candles = {
      name: 'Candles',
      type: 'candlestick' as const,
      data: this.candles.map((c, i) => ({
        x: i,
        y: [c.o, c.h, c.l, c.c]
      }))
    };

    // SMA20
    const sma20 = this.calcSMA(20).map((v, i) => ({
      x: i + (this.candles.length - this.calcSMA(20).length),
      y: v.y
    }));
    const sma20Line = { name: 'SMA20', type: 'line' as const, data: sma20 };

    // EMA50
    const ema50 = this.calcEMA(50).map((v, i) => ({
      x: i + (this.candles.length - this.calcEMA(50).length),
      y: v.y
    }));
    const ema50Line = { name: 'EMA50', type: 'line' as const, data: ema50 };

    // Volumi dentro al main
    const volumes = {
      name: 'Volume',
      type: 'bar' as const,
      data: this.candles.map((c, i) => ({ x: i, y: c.v }))
    };

    this.series = [candles, sma20Line, ema50Line, volumes];
    this.chartOptions = {
      chart: { type: 'candlestick', height: 400, background: '#1e222d', foreColor: '#fff' },
      xaxis: { type: 'category' },
      yaxis: [{ tooltip: { enabled: true } }],
      stroke: { width: [1, 2, 2, 0] },
      plotOptions: { bar: { columnWidth: '60%' } }
    };

  } else if (this.mode === 'volume') {
    const volumesOnly = {
      name: 'Volume',
      type: 'bar' as const,
      data: this.candles.map((c, i) => ({ x: i, y: c.v }))
    };
    this.series = [volumesOnly];
    this.chartOptions = {
      chart: { type: 'bar', height: 120, background: '#1e222d', foreColor: '#fff' },
      xaxis: { type: 'category', labels: { show: false } },
      yaxis: {
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      plotOptions: { bar: { columnWidth: '60%' } }
    };

  } else if (this.mode === 'rsi') {
    const rsiData = this.calcRSI(14).map(v => ({ x: v.x, y: v.y }));
    this.series = [{ name: 'RSI', type: 'line', data: rsiData }];
    this.chartOptions = {
      chart: { type: 'line', height: 150, background: '#1e222d', foreColor: '#fff' },
      xaxis: { type: 'category' },
      yaxis: { min: 0, max: 100, tickAmount: 5 }
    };

  } else if (this.mode === 'macd') {
    const { macd, signal, hist } = this.calcMACD();
    this.series = [
      { name: 'MACD', type: 'line', data: macd },
      { name: 'Signal', type: 'line', data: signal },
      { name: 'Histogram', type: 'bar', data: hist }
    ];
    this.chartOptions = {
      chart: { type: 'line', height: 200, background: '#1e222d', foreColor: '#fff' },
      xaxis: { type: 'category' },
      yaxis: { labels: { show: true } },
      stroke: { width: [2, 2, 0] },
      plotOptions: { bar: { columnWidth: '70%' } }
    };
  }
}


  // 📐 Calcolo SMA
  private calcSMA(period: number): { x: Date; y: number }[] {
    const out: { x: Date; y: number }[] = [];
    if (this.candles.length < period) return out;

    for (let i = period - 1; i < this.candles.length; i++) {
      const slice = this.candles.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, c) => sum + c.c, 0) / period;
      out.push({ x: new Date(this.candles[i].t * 1000), y: avg });
    }
    return out;
  }

  // 📐 Calcolo EMA
  private calcEMA(period: number): { x: Date; y: number }[] {
    const out: { x: Date; y: number }[] = [];
    if (this.candles.length < period) return out;

    let k = 2 / (period + 1);
    let emaPrev = this.candles
      .slice(0, period)
      .reduce((sum, c) => sum + c.c, 0) / period;

    out.push({ x: new Date(this.candles[period - 1].t * 1000), y: emaPrev });

    for (let i = period; i < this.candles.length; i++) {
      const price = this.candles[i].c;
      emaPrev = price * k + emaPrev * (1 - k);
      out.push({ x: new Date(this.candles[i].t * 1000), y: emaPrev });
    }
    return out;
  }

  // 📐 Calcolo RSI
  private calcRSI(period: number = 14): { x: number; y: number }[] {
    if (this.candles.length < period + 1) return [];

    const out: { x: number; y: number }[] = [];
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = this.candles[i].c - this.candles[i - 1].c;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    out.push({ x: period, y: rsi });

    for (let i = period + 1; i < this.candles.length; i++) {
      const diff = this.candles[i].c - this.candles[i - 1].c;
      let gain = diff > 0 ? diff : 0;
      let loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
      out.push({ x: i, y: rsi });
    }

    return out;
  }

  // 📐 Calcolo MACD
  private calcMACD(): {
    macd: { x: number; y: number }[],
    signal: { x: number; y: number }[],
    hist: { x: number; y: number }[]
  } {
    if (this.candles.length < 26) return { macd: [], signal: [], hist: [] };

    const ema = (period: number): number[] => {
      const k = 2 / (period + 1);
      const prices = this.candles.map(c => c.c);
      let emaArr: number[] = [];
      let sma = prices.slice(0, period).reduce((a, b) => a + b) / period;
      emaArr[period - 1] = sma;
      for (let i = period; i < prices.length; i++) {
        emaArr[i] = prices[i] * k + emaArr[i - 1] * (1 - k);
      }
      return emaArr;
    };

    const ema12 = ema(12);
    const ema26 = ema(26);
    const macdLine: number[] = [];

    for (let i = 0; i < this.candles.length; i++) {
      if (ema12[i] && ema26[i]) macdLine[i] = ema12[i] - ema26[i];
      else macdLine[i] = 0;
    }

    const k = 2 / (9 + 1);
    const signalLine: number[] = [];
    let smaMacd = macdLine.slice(0, 9).reduce((a, b) => a + b) / 9;
    signalLine[8] = smaMacd;
    for (let i = 9; i < macdLine.length; i++) {
      signalLine[i] = macdLine[i] * k + signalLine[i - 1] * (1 - k);
    }

    const hist: number[] = macdLine.map((v, i) => v - (signalLine[i] || 0));

    return {
      macd: macdLine.map((y, i) => ({ x: i, y })),
      signal: signalLine.map((y, i) => ({ x: i, y })),
      hist: hist.map((y, i) => ({ x: i, y }))
    };
  }
}

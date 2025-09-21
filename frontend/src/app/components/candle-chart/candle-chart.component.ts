import { Component, OnInit, OnDestroy, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ChartComponent,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexAxisChartSeries,
  ApexOptions,
  ApexYAxis,
  ApexTooltip
} from 'ng-apexcharts';

export type Candle = {
  t: number; o: number; h: number; l: number; c: number; v: number; x?: boolean;
};

@Component({
  selector: 'app-candle-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `<div class="p-4">
    <div *ngIf="isLoading" class="loading">Caricamento {{symbol}}...</div>
    <apx-chart 
      #chart
      *ngIf="!isLoading" 
      [series]="chartOptions.series"
      [chart]="chartOptions.chart"
      [xaxis]="chartOptions.xaxis"
      [title]="chartOptions.title">
    </apx-chart>
  </div>`,
  styleUrls: ['./candle-chart.component.scss']
})
export class CandleChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';
  isLoading = false;
  candles: Candle[] = [];
  ws: WebSocket | null = null;

  public chartOptions = {
  series: [
    {
      name: 'Candles',
      data: [] as { x: Date; y: number[] }[]
    }
  ],
  chart: {
    type: 'candlestick' as const,
    height: 600,
    animations: { enabled: false },
    background: '#1a1d29',
    foreColor: '#e0e0e0',
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: false,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: false,
        reset: true
      }
    }
  },
  xaxis: {
    type: 'datetime' as const,
    labels: { style: { colors: '#9ca3af' } },
    axisBorder: { color: '#2a2e39' },
    axisTicks: { color: '#2a2e39' }
  },
  yaxis: {
    labels: { style: { colors: '#9ca3af' } }
  },
  title: {
    text: 'Candele (1s)',
    align: 'center' as const,
    style: { color: '#e0e0e0' }
  },
  tooltip: { theme: 'dark' as const }
};



  ngOnInit() {
    this.connectWS();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      this.isLoading = true;
      this.disconnect();
      this.candles = [];
      this.updateChart();
      setTimeout(() => {
        this.connectWS();
        this.isLoading = false;
      }, 100);
    }
  }

  ngOnDestroy() {
    this.disconnect();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  connectWS() {
    const url = `ws://localhost:8000/ws/candles1s?symbol=${this.symbol.toLowerCase()}`;
    console.log("🔗 Connessione a:", url);
  
    this.ws = new WebSocket(url);
  
    this.ws.onopen = () => console.log(`✅ WS connesso per ${this.symbol}`);
    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        console.log("📡 Dati ricevuti:", data);
        this.handleMessage(data);
      } catch (error) {
        console.error('❌ Errore parsing dati:', error, msg.data);
      }
    };
    this.ws.onerror = (err) => console.error('❌ WS errore:', err);
    this.ws.onclose = () => console.log('🔚 WS chiuso');
  }
  
  handleMessage(candle: any) {
  const timestamp = candle.t;  // già in ms

  const newCandle: Candle = {
    t: timestamp,
    o: candle.o,
    h: candle.h,
    l: candle.l,
    c: candle.c,
    v: candle.v,
    x: candle.x
  };

  const existingIndex = this.candles.findIndex(c => c.t === timestamp);
  if (existingIndex !== -1) {
    this.candles[existingIndex] = newCandle;
  } else {
    this.candles.push(newCandle);
    if (this.candles.length > 50) this.candles.shift();
  }

  this.updateChart();
}

updateChart() {
  const seriesData = this.candles.map(c => ({
    x: new Date(c.t),   // già ms → niente moltiplicazione
    y: [c.o, c.h, c.l, c.c]
  }));

  if (this.chart?.updateSeries) {
    this.chart.updateSeries([{ name: 'Candles', data: seriesData }], false);
    this.chart.updateOptions({
      title: { text: `${this.symbol} Candele (1s)` }
    });
  }
}
}
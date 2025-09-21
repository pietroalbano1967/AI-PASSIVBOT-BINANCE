import { Component, OnInit, OnDestroy, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ChartComponent,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexAxisChartSeries
} from 'ng-apexcharts';

export type Candle = {
  t: number; o: number; h: number; l: number; c: number; v: number; x?: boolean;
};

@Component({
  selector: 'app-candle-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `<apx-chart
      #chart
      [series]="chartOptions.series"
      [chart]="chartOptions.chart"
      [xaxis]="chartOptions.xaxis"
      [title]="chartOptions.title">
    </apx-chart>`,
  styleUrls: ['./candle-chart.component.scss']
})
export class CandleChartComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';
  isLoading = false;
  candles: Candle[] = [];
  ws: WebSocket | null = null;

  chartOptions: {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    title: ApexTitleSubtitle;
  } = {
    series: [{ data: [] }],
    chart: {
      type: 'candlestick',
      height: 600,
      animations: { enabled: false }
    },
    xaxis: { type: 'datetime' },
    title: { text: 'Candele (1s)', align: 'center' }
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
    // ✅ URL CORRETTO: /ws/candles1s con parametro query
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
    // ✅ Converti timestamp da millisecondi a secondi
    const timestamp = candle.t / 1000;
    
    const newCandle: Candle = {
      t: timestamp,
      o: candle.o,
      h: candle.h,
      l: candle.l,
      c: candle.c,
      v: candle.v,
      x: candle.x
    };
  
    // ✅ Trova se esiste già una candela con questo timestamp
    const existingIndex = this.candles.findIndex(c => c.t === timestamp);
    
    if (existingIndex !== -1) {
      this.candles[existingIndex] = newCandle;
    } else {
      this.candles.push(newCandle);
      if (this.candles.length > 50) {
        this.candles.shift();
      }
    }
  
    this.updateChart();
  }
  
  updateChart() {
    const seriesData = this.candles.map(c => ({
      x: new Date(c.t * 1000), // ✅ Converti in Date object (ms)
      y: [c.o, c.h, c.l, c.c]
    }));
  
    if (this.chart && this.chart.updateSeries) {
      this.chart.updateSeries([{ 
        name: 'Candles',
        data: seriesData 
      }], false);
      
      // Aggiorna anche il titolo con il simbolo corrente
      this.chart.updateOptions({
        title: {
          text: `${this.symbol} Candele (1s)`
        }
      });
    }
  }
}
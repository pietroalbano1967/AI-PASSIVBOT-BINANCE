import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexYAxis,
  ChartComponent,
  NgApexchartsModule
} from 'ng-apexcharts';
import { Subscription } from 'rxjs';
import { CandleService, Candle } from '../../services/candle.service';
import { WsService } from '../../services/ws.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
};

export interface CandleSeries {
  x: Date;
  y: [number, number, number, number];
}

@Component({
  selector: 'app-candle-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './candle-chart.component.html',
  styleUrls: ['./candle-chart.component.scss']
})
export class CandleChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';

  public chartOptions: Partial<ChartOptions>;
  private wsSub?: Subscription;
  candles: CandleSeries[] = [];
  loading: boolean = true;
  errorMessage: string = '';

  constructor(
    private candleService: CandleService,
    private wsService: WsService
  ) {
    this.chartOptions = {
      series: [{ name: 'candles', data: [] }],
      chart: { 
        type: 'candlestick', 
        height: 500,
        background: '#1e222d',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        }
      },
      title: { 
        text: 'BTCUSDT Candlestick', 
        align: 'left',
        style: {
          color: '#fff',
          fontSize: '16px'
        }
      },
      xaxis: { 
        type: 'datetime',
        labels: {
          style: {
            colors: '#ccc'
          }
        }
      },
      yaxis: { 
        tooltip: { enabled: true },
        labels: {
          style: {
            colors: '#ccc'
          }
        }
      }
    };
  }

  ngOnInit(): void {
    console.log('📈 CandleChartComponent inizializzato con simbolo:', this.symbol);
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol'] && changes['symbol'].currentValue !== changes['symbol'].previousValue) {
      console.log('🔄 Cambio simbolo:', this.symbol);
      this.stopStream();
      this.clearChartData();
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.stopStream();
  }

  retry() {
    this.errorMessage = '';
    this.loadData();
  }

 private loadData() {
  console.log('🔁 loadData chiamato per:', this.symbol);
  this.stopStream();
  this.clearChartData();
  this.loading = true;
  this.errorMessage = '';

  // 1️⃣ storico REST
  console.log('📡 Richiesta REST per:', this.symbol);
  this.candleService.getCandles(this.symbol, '1m', 100).subscribe({
    next: (candles: Candle[]) => {
      console.log('✅ Dati REST ricevuti:', candles.length, 'candele');
      
      if (candles && candles.length > 0) {
        this.candles = candles.map(c => ({
          x: new Date(c.t * 1000),
          y: [c.o, c.h, c.l, c.c]
        }));
        
        console.log('📊 Candele processate:', this.candles.length);
        
        // Aggiorna il chart
        this.chartOptions = {
          ...this.chartOptions,
          series: [{ name: 'candles', data: [...this.candles] }]
        };
        
        // 2️⃣ Connetti WebSocket SOLO dopo i dati REST
        this.connectWebSocket();
      } else {
        this.errorMessage = 'Nessun dato disponibile';
      }

      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Errore caricamento storico:', err);
      this.loading = false;
      this.errorMessage = 'Errore caricamento dati';
    }
  });
}

  // candle-chart.component.ts
private connectWebSocket() {
  console.log('📡 Tentativo connessione WS per:', this.symbol.toLowerCase());
  
  this.stopStream();
  
  this.wsSub = this.wsService
    .connectCandles(this.symbol.toLowerCase(), '1s')
    .subscribe({
      next: (wsData: any) => {
        console.log('📡 Dati WS ricevuti:', wsData);
        this.updateCandles(wsData);  // ← Passa direttamente i dati WS
      },
      error: (err: any) => {
        console.error('❌ Errore WS subscription:', err);
        // Prova a riconnettere dopo 5 secondi
        setTimeout(() => this.connectWebSocket(), 5000);
      },
      complete: () => {
        console.log('🔌 WS subscription completata');
      }
    });
}

  private clearChartData() {
    this.candles = [];
    this.chartOptions = {
      ...this.chartOptions,
      series: [{ name: 'candles', data: [] }]
    };
  }

  private stopStream() {
    if (this.wsSub) {
      this.wsSub.unsubscribe();
      this.wsSub = undefined;
      console.log('🔌 WebSocket disconnesso');
    }
    this.wsService.disconnect();
  }

  public testBackendConnection() {
    this.candleService.testConnection().subscribe({
      next: (res) => console.log('✅ Backend raggiungibile', res),
      error: (err) => {
        console.error('❌ Backend non raggiungibile', err);
        this.errorMessage = 'Backend non raggiungibile. Verifica che il server sia in esecuzione.';
        this.loading = false;
      }
    });
  }

// candle-chart.component.ts
private updateCandles(wsData: any) {
  console.log('📡 Dato WS ricevuto:', wsData);
  
  // Normalizza i dati - il WS usa 's' invece di 'symbol'
  const candle: Candle = {
    t: wsData.t || Math.floor(Date.now() / 1000),
    symbol: wsData.symbol || wsData.s,  // ← 's' invece di 'symbol'
    o: Number(wsData.o || wsData.open),
    h: Number(wsData.h || wsData.high), 
    l: Number(wsData.l || wsData.low),
    c: Number(wsData.c || wsData.close),
    v: Number(wsData.v || wsData.volume)
  };

  console.log('🔄 Candela normalizzata:', candle);

  const lastCandle = this.candles[this.candles.length - 1];

  if (lastCandle && lastCandle.x.getTime() === candle.t * 1000) {
    // Aggiorna candela esistente
    lastCandle.y = [candle.o, candle.h, candle.l, candle.c];
  } else {
    // Aggiungi nuova candela
    this.candles.push({
      x: new Date(candle.t * 1000),
      y: [candle.o, candle.h, candle.l, candle.c]
    });

    // Mantieni solo ultime 200 candele
    if (this.candles.length > 200) {
      this.candles.shift();
    }
  }

  // Aggiorna il chart
  this.chartOptions = {
    ...this.chartOptions,
    series: [{ name: 'candles', data: [...this.candles] }]
  };
}
}
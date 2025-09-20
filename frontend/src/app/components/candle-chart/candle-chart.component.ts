import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  Input,
  ChangeDetectorRef,
  NgZone
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
  private maxCandles = 50;
  private initialDataLoaded: boolean = false;
  private updateQueue: any[] = [];
  private isUpdating: boolean = false;

  constructor(
    private candleService: CandleService,
    private wsService: WsService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
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
        },
        animations: {
          enabled: false, // Disabilita animazioni per evitare lampeggi
          speed: 0
        }
      },
      title: { 
        text: `${this.symbol} Candlestick`, 
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
    this.connectWebSocket();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol'] && changes['symbol'].currentValue !== changes['symbol'].previousValue) {
      console.log('🔄 Cambio simbolo:', this.symbol);
      this.loading = true;
      this.stopStream();
      this.clearChartData();
      this.connectWebSocket();
    }
  }

  ngOnDestroy(): void {
    this.stopStream();
  }

  retry() {
    this.errorMessage = '';
    this.connectWebSocket();
  }

  private connectWebSocket() {
    console.log('📡 Tentativo connessione WS per:', this.symbol.toLowerCase());
    
    this.stopStream();
    this.loading = true;
    this.errorMessage = '';
    this.initialDataLoaded = false;
    
    this.wsSub = this.wsService
      .connectCandles(this.symbol.toLowerCase(), '1s')
      .subscribe({
        next: (wsData: any) => {
          if (!this.initialDataLoaded) {
            this.loading = false;
            this.initialDataLoaded = true;
            this.cdr.detectChanges();
          }
          
          // Aggiungi all'update queue invece di processare immediatamente
          this.updateQueue.push(wsData);
          
          // Processa la coda (debounce per evitare troppi aggiornamenti)
          if (!this.isUpdating) {
            this.processUpdateQueue();
          }
        },
        error: (err: any) => {
          console.error('❌ Errore WS subscription:', err);
          this.loading = false;
          this.errorMessage = 'Errore di connessione WebSocket';
          this.cdr.detectChanges();
          
          setTimeout(() => this.connectWebSocket(), 5000);
        },
        complete: () => {
          console.log('🔌 WS subscription completata');
        }
      });
  }

 private processUpdateQueue() {
  if (this.updateQueue.length === 0) {
    this.isUpdating = false;
    return;
  }
  
  this.isUpdating = true;
  
  // ✅ CORREZIONE: Processa TUTTI gli elementi nella coda
  const queueToProcess = [...this.updateQueue];
  this.updateQueue = []; // Svuota la coda dopo averla copiata
  
  this.ngZone.runOutsideAngular(() => {
    // Processa tutti gli elementi della coda
    queueToProcess.forEach(wsData => {
      this.updateCandles(wsData);
    });
    
    // Debounce: aspetta 50ms invece di 100ms
    setTimeout(() => {
      this.isUpdating = false;
      this.processUpdateQueue();
    }, 50);
  });
}

  private clearChartData() {
    this.candles = [];
    this.updateQueue = [];
    this.updateChartData();
  }

  private stopStream() {
    if (this.wsSub) {
      this.wsSub.unsubscribe();
      this.wsSub = undefined;
      console.log('🔌 WebSocket disconnesso');
    }
    this.wsService.disconnect();
    this.updateQueue = [];
    this.isUpdating = false;
  }

  public testBackendConnection() {
    this.candleService.testConnection().subscribe({
      next: (res) => console.log('✅ Backend raggiungibile', res),
      error: (err) => {
        console.error('❌ Backend non raggiungibile', err);
        this.errorMessage = 'Backend non raggiungibile. Verifica che il server sia in esecuzione.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateCandles(wsData: any) {
    try {
      // Normalizza i dati
      const candle: Candle = {
        t: wsData.t || Math.floor(Date.now() / 1000),
        symbol: wsData.symbol || wsData.s,
        o: Number(wsData.o || wsData.open),
        h: Number(wsData.h || wsData.high), 
        l: Number(wsData.l || wsData.low),
        c: Number(wsData.c || wsData.close),
        v: Number(wsData.v || wsData.volume)
      };

      const candleTime = new Date(candle.t * 1000);
      const lastCandle = this.candles[this.candles.length - 1];

      if (lastCandle && lastCandle.x.getTime() === candleTime.getTime()) {
        // Aggiorna candela esistente
        lastCandle.y = [candle.o, candle.h, candle.l, candle.c];
      } else {
        // Aggiungi nuova candela
        this.candles.push({
          x: candleTime,
          y: [candle.o, candle.h, candle.l, candle.c]
        });

        // Mantieni solo ultime 50 candele
        if (this.candles.length > this.maxCandles) {
          this.candles.shift();
        }
      }

      // Aggiorna il chart in modo ottimizzato
      this.updateChartData();
    } catch (error) {
      console.error('❌ Errore nell\'aggiornamento delle candele:', error);
    }
  }

  // Metodo ottimizzato per aggiornare i dati del chart
  private updateChartData() {
  // Forza l'aggiornamento completo se necessario
  if (this.chart && this.chart.updateSeries) {
    this.chart.updateSeries([{
      name: 'candles',
      data: [...this.candles]
    }], false);
  } else {
    // Aggiorna l'oggetto chartOptions se il chart non è ancora inizializzato
    this.chartOptions.series = [{
      name: 'candles',
      data: [...this.candles]
    }];
  }
  
  // Aggiorna sempre il titolo
  this.chartOptions.title = {
    text: `${this.symbol} Candlestick`,
    align: 'left',
    style: {
      color: '#fff',
      fontSize: '16px'
    }
  };
  
  this.cdr.detectChanges();
}
}
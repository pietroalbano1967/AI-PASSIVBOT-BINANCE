import { Component, OnInit, OnDestroy, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ChartComponent,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexYAxis,
  ApexTooltip
} from 'ng-apexcharts';
import { CandleService } from '../../services/candle.service';
import { Subscription } from 'rxjs';

// Definisci l'interfaccia Candle correttamente
interface Candle {
  t: number;        // timestamp in millisecondi
  o: number;        // open
  h: number;        // high
  l: number;        // low
  c: number;        // close
  v: number;        // volume
  x?: boolean;      // chiusa?
}

@Component({
  selector: 'app-candle-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="p-4 relative">
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <span>Caricamento {{symbol}}...</span>
      </div>
      
      <div *ngIf="errorMessage" class="error-message">
        {{errorMessage}}
      </div>

      <apx-chart 
        #chart
        *ngIf="!isLoading && candles.length > 0" 
        [series]="chartOptions.series"
        [chart]="chartOptions.chart"
        [xaxis]="chartOptions.xaxis"
        [yaxis]="chartOptions.yaxis"
        [title]="chartOptions.title"
        [tooltip]="chartOptions.tooltip">
      </apx-chart>

      <div *ngIf="!isLoading && candles.length === 0 && !errorMessage" class="no-data">
        <p>Nessun dato disponibile per {{symbol}}</p>
        <button (click)="loadData()" class="retry-btn">Riprova</button>
      </div>
    </div>
  `,
  styleUrls: ['./candle-chart.component.scss']
})
export class CandleChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';
  isLoading = true;
  errorMessage = '';
  candles: Candle[] = [];
  private historicalSubscription!: Subscription;
  private wsSubscription!: Subscription;

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
      toolbar: { show: true }
    },
    xaxis: {
      type: 'datetime' as const,
      labels: { style: { colors: '#9ca3af' } }
    },
    yaxis: {
      labels: { style: { colors: '#9ca3af' } },
      tooltip: { enabled: true }
    },
    title: {
      text: 'Candele in caricamento...',
      align: 'center' as const,
      style: { color: '#e0e0e0' }
    },
    tooltip: { 
      theme: 'dark' as const,
      x: {
        format: 'dd MMM yyyy HH:mm:ss'
      }
    }
  };

  constructor(private candleService: CandleService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      this.reset();
      this.loadData();
    }
  }

  ngOnDestroy() {
    this.reset();
  }

  private reset() {
    this.isLoading = true;
    this.errorMessage = '';
    this.candles = [];
    
    if (this.historicalSubscription) {
      this.historicalSubscription.unsubscribe();
    }
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }

  loadData() {
    this.reset();
    
    console.log(`📊 Caricamento dati per ${this.symbol}`);
    
    // 1. PRIMA carica dati storici
    this.historicalSubscription = this.candleService.getHistoricalData(this.symbol, 30).subscribe({
      next: (historicalData: any[]) => {
        console.log(`✅ Ricevute ${historicalData.length} candele storiche`, historicalData);
        
        // Converti i dati REST nel formato corretto
        this.candles = historicalData.map(item => this.parseCandle(item));
        
        console.log(`📈 Candele convertite:`, this.candles);
        
        this.updateChart();
        this.isLoading = false;
        
        // 2. POI connetti al WebSocket per dati real-time
        this.connectWebSocket();
      },
      error: (err) => {
        console.error('❌ Errore dati storici:', err);
        this.errorMessage = 'Errore caricamento dati storici';
        this.isLoading = false;
        this.connectWebSocket(); // Prova comunque il WebSocket
      }
    });
  }

  private parseCandle(data: any): Candle {
    // Gestisci sia dati REST che WebSocket
    return {
      t: data.t, // timestamp in millisecondi
      o: typeof data.o === 'number' ? data.o : parseFloat(data.o),
      h: typeof data.h === 'number' ? data.h : parseFloat(data.h),
      l: typeof data.l === 'number' ? data.l : parseFloat(data.l),
      c: typeof data.c === 'number' ? data.c : parseFloat(data.c),
      v: typeof data.v === 'number' ? data.v : parseFloat(data.v),
      x: data.x !== undefined ? data.x : true
    };
  }

  private connectWebSocket() {
    try {
      console.log(`🔗 Connettendo al WebSocket per ${this.symbol}`);
      
      const wsSubject = this.candleService.createWebSocket(this.symbol);
      
      this.wsSubscription = wsSubject.subscribe({
        next: (candle: any) => {
          console.log('📡 Nuova candela dal WebSocket:', candle);
          this.handleNewCandle(candle);
        },
        error: (err) => {
          console.warn('⚠️ WebSocket non disponibile:', err);
          // Non mostrare errore, il WebSocket è opzionale
        },
        complete: () => {
          console.log('WebSocket completato');
        }
      });
    } catch (error) {
      console.warn('⚠️ Errore connessione WebSocket:', error);
    }
  }

  private handleNewCandle(candleData: any) {
    const candle = this.parseCandle(candleData);
    
    console.log('🕯️ Elaborando candela:', candle);
    
    const existingIndex = this.candles.findIndex(c => c.t === candle.t);
    
    if (existingIndex !== -1) {
      // Aggiorna candela esistente
      this.candles[existingIndex] = candle;
      console.log('↻ Candela aggiornata');
    } else {
      // Aggiungi nuova candela (mantieni ordine cronologico)
      this.candles.push(candle);
      this.candles.sort((a, b) => a.t - b.t);
      
      // Mantieni massimo 100 candele
      if (this.candles.length > 50) {
        this.candles.shift();
      }
      
      console.log('➕ Nuova candela aggiunta');
    }
    
    this.updateChart();
  }

  private updateChart() {
    if (this.candles.length === 0) {
      console.log('⏹️ Nessuna candela da visualizzare');
      return;
    }
    
    console.log(`🔄 Aggiornamento chart con ${this.candles.length} candele`);
    
    const seriesData = this.candles.map(c => ({
      x: new Date(c.t),
      y: [c.o, c.h, c.l, c.c]
    }));

    // Aggiorna le opzioni del chart
    this.chartOptions = {
      ...this.chartOptions,
      series: [{ name: 'Candles', data: seriesData }],
      title: {
        ...this.chartOptions.title,
        text: `${this.symbol} - ${this.candles.length} candele`
      }
    };

    // Aggiorna il chart solo se esiste
    if (this.chart && typeof this.chart.updateSeries === 'function') {
      try {
        this.chart.updateSeries([{ name: 'Candles', data: seriesData }]);
        console.log('✅ Chart aggiornato con successo');
      } catch (error) {
        console.error('❌ Errore aggiornamento chart:', error);
      }
    } else {
      console.log('⏳ Chart non pronto per l\'aggiornamento');
    }
  }
}
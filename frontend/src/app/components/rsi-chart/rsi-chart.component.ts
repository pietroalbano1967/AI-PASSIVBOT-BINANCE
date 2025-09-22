import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexMarkers,
  ApexGrid
} from 'ng-apexcharts';
import { Subscription } from 'rxjs';
import { SignalsService, SignalData } from '../../services/signals.service';
import { DashboardStateService } from '../../services/dashboard-state.service'; // ✅ AGGIUNGI

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  grid: ApexGrid;
};

@Component({
  selector: 'app-rsi-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './rsi-chart.component.html',
  styleUrls: ['./rsi-chart.component.scss']
})
export class RsiChartComponent implements OnInit, OnDestroy, OnChanges {
  @Input() symbol: string = 'BTCUSDT';
  private subscription?: Subscription;
  public chartOptions: ChartOptions;
  public hasData: boolean = false;
  public loading: boolean = true;
  public errorMessage: string = '';
  public isConnected: boolean = false;
  private isActive = true; // ✅ AGGIUNGI

  constructor(
    private signalsService: SignalsService,
    private cdr: ChangeDetectorRef,
    private stateService: DashboardStateService // ✅ AGGIUNGI NEL COSTRUTTORE
  ) {
    this.chartOptions = this.createChartOptions();
  }

  ngOnInit() {
    console.log('📈 RSI Chart initialized for:', this.symbol);
    this.isActive = true;
    
    // ✅ Prova a recuperare dati esistenti
    this.initializeWithExistingData();
  }

  private initializeWithExistingData() {
    // ✅ Verifica se il metodo esiste prima di chiamarlo
    if (this.stateService && typeof this.stateService['restoreComponentState'] === 'function') {
      const existingData = this.stateService['restoreComponentState']('rsi', this.symbol);
      if (existingData && existingData.length > 0) {
        console.log(`📂 RSI: Ripristinati ${existingData.length} punti dal cache`);
        this.setChartData(existingData);
        this.loading = false;
        this.hasData = true;
      }
    }
    
    // ✅ Connetti comunque per aggiornamenti real-time
    this.connectToSignals();
  }

  private setChartData(dataPoints: any[]) {
    const seriesData = dataPoints.map(item => ({
      x: new Date(item.t * 1000),
      y: item.rsi || item.y
    }));

    this.chartOptions = {
      ...this.chartOptions,
      series: [{ name: 'RSI', data: seriesData }],
      title: {
        ...this.chartOptions.title,
        text: `RSI (14) - ${this.symbol} - ${seriesData[seriesData.length - 1]?.y || 0}`
      }
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      console.log('🔄 Symbol changed to:', this.symbol);
      
      if (this.isActive) {
        this.reconnectForNewSymbol();
      }
    }
  }

  ngOnDestroy() {
    this.isActive = false;
    this.disconnect();
    console.log('📊 RSI Chart destroyed');
  }

  // ✅ METODI PER GESTIONE STATO ATTIVO/INATTIVO
  ionViewDidEnter() {
    this.isActive = true;
    console.log('📈 RSI Chart riattivato');
    this.cdr.detectChanges();
  }

  ionViewWillLeave() {
    this.isActive = false;
    console.log('⏸️  RSI Chart in pausa');
  }

  private reconnectForNewSymbol() {
    if (!this.isActive) return;
    
    this.disconnect();
    this.chartOptions = this.createChartOptions();
    this.hasData = false;
    this.loading = true;
    this.errorMessage = '';
    this.connectToSignals();
  }

  public connectToSignals() {
    if (!this.isActive) {
      console.log('⏸️  RSI Chart in pausa - connessione rimandata');
      return;
    }
    
    console.log(`🔗 Connecting to signals for ${this.symbol}`);
    
    this.loading = true;
    this.errorMessage = '';

    this.subscription = this.signalsService.connect(this.symbol).subscribe({
      next: (data: SignalData) => {
        if (!this.isActive) {
          console.log('⏸️  RSI Chart in pausa - dato ignorato');
          return;
        }
        
        this.isConnected = true;
        
        if (data.signal === 'CONNESSIONE STABILITA' || (data as any).heartbeat) {
          console.log('✅ Connessione WebSocket stabilita');
          return;
        }
        
        console.log('📡 RSI Data received:', data);
        this.addRSI(data);
      },
      error: (err) => {
        if (!this.isActive) return;
        
        console.error('❌ RSI Chart connection error:', err);
        this.isConnected = false;
        this.errorMessage = 'Errore di connessione al servizio segnali';
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        if (!this.isActive) return;
        
        console.log('✅ RSI Chart connection completed');
        this.isConnected = false;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private disconnect() {
  if (this.subscription) {
    this.subscription.unsubscribe();
  }
  // ✅ CORREGGI: Rimuovi il parametro o usa la versione corretta
  this.signalsService.disconnect(); // Senza parametri
}

  private createChartOptions(): ChartOptions {
    return {
      series: [
        {
          name: 'RSI',
          data: []
        }
      ],
      chart: {
        type: 'line',
        height: 300,
        background: '#1a1d29',
        foreColor: '#e0e0e0',
        animations: { enabled: false },
        toolbar: { show: true },
        zoom: { enabled: false }
      },
      xaxis: {
        type: 'datetime',
        labels: { 
          style: { colors: '#9ca3af' }
        },
        axisBorder: { color: '#2a2e39' },
        axisTicks: { color: '#2a2e39' }
      },
      yaxis: {
        min: 0,
        max: 100,
        labels: { style: { colors: '#9ca3af' } },
        title: { text: 'RSI Value', style: { color: '#9ca3af' } }
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        colors: ['#00E396']
      },
      title: {
        text: `RSI (14) - ${this.symbol}`,
        align: 'center',
        style: { color: '#e0e0e0', fontSize: '16px', fontWeight: 'bold' }
      },
      tooltip: {
        theme: 'dark',
        x: { 
          format: 'dd MMM yyyy HH:mm:ss'
        }
      },
      markers: {
        size: 0,
        hover: { size: 5 }
      },
      grid: {
        borderColor: '#2a2e39',
        strokeDashArray: 4
      }
    };
  }

  private addRSI(data: SignalData) {
    if (!this.isActive) {
      console.log('⏸️  RSI Chart in pausa - dato ignorato');
      return;
    }
    
    if (data.rsi === undefined || data.rsi === null || isNaN(data.rsi)) {
      console.warn('⚠️ RSI invalido, ignorato:', data.rsi);
      return;
    }

    const point = {
      x: new Date(data.t * 1000),
      y: Math.round(data.rsi * 100) / 100
    };

    // ✅ Log: distinguo bootstrap da real-time
    if ((this.chartOptions.series[0].data as any[]).length === 0) {
      console.log(`📂 RSI bootstrap ricevuto per ${this.symbol}:`, point);
    } else {
      console.log(`📡 RSI real-time ricevuto per ${this.symbol}:`, point);
    }

    const currentData = this.chartOptions.series[0].data as any[];
    const newData = [...currentData, point];

    if (newData.length > 50) {
      newData.shift();
    }

    this.chartOptions = {
      ...this.chartOptions,
      series: [{ name: 'RSI', data: newData }],
      title: {
        ...this.chartOptions.title,
        text: `RSI (14) - ${this.symbol} - ${point.y}`
      }
    };

    this.hasData = newData.length > 0;
    this.loading = false;
    this.cdr.detectChanges();
  }

  // ✅ Metodo pubblico per ritentare la connessione
  retryConnection() {
    this.errorMessage = '';
    this.loading = true;
    this.disconnect();
    this.connectToSignals();
  }
}
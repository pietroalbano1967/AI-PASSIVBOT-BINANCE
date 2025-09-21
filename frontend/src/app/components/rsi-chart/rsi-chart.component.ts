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

  constructor(
    private signalsService: SignalsService,
    private cdr: ChangeDetectorRef
  ) {
    this.chartOptions = this.createChartOptions();
  }

  ngOnInit() {
    console.log('📈 RSI Chart initialized for:', this.symbol);
    this.connectToSignals();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      console.log('🔄 Symbol changed to:', this.symbol);
      this.disconnect();
      this.chartOptions = this.createChartOptions();
      this.hasData = false;
      this.loading = true;
      this.connectToSignals();
    }
  }

  ngOnDestroy() {
    this.disconnect();
    console.log('📊 RSI Chart destroyed');
  }

  private connectToSignals() {
    this.subscription = this.signalsService.connect(this.symbol).subscribe({
      next: (data: SignalData) => {
        this.addRSI(data);
      },
      error: (err) => {
        console.error('❌ RSI Chart error:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('✅ RSI Chart completed');
        this.loading = false;
      }
    });
  }

  private disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.signalsService.disconnect();
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
          style: { colors: '#9ca3af' },
          datetimeFormatter: {
            hour: 'HH:mm:ss'
          }
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
    console.log('📊 RSI Data received:', data);
    
    if (data.rsi === undefined || data.rsi === null) {
      console.warn('⚠️ RSI data missing from signal');
      return;
    }

    const point = {
      x: new Date(data.t * 1000),
      y: Math.round(data.rsi * 100) / 100 // Arrotonda a 2 decimali
    };

    // Aggiorna la serie
    const currentData = this.chartOptions.series[0].data as any[];
    const newData = [...currentData, point];
    
    // Mantieni solo gli ultimi 50 punti
    if (newData.length > 50) {
      newData.shift();
    }

    this.chartOptions = {
      ...this.chartOptions,
      series: [{
        name: 'RSI',
        data: newData
      }],
      title: {
        ...this.chartOptions.title,
        text: `RSI (14) - ${this.symbol} - ${point.y}`
      }
    };

    this.hasData = newData.length > 0;
    this.loading = false;
    this.cdr.detectChanges();
  }
  // Aggiungi al componente RSIChartComponent
private addTestData() {
  // Dati di test
  const testData: SignalData[] = [
    { symbol: this.symbol, close: 50000, ma5: 49000, ma20: 48000, rsi: 45, signal: 'HOLD', confidence: 0.6, probs: {}, action: null, t: Math.floor(Date.now() / 1000) - 60 },
    { symbol: this.symbol, close: 50100, ma5: 49100, ma20: 48100, rsi: 52, signal: 'HOLD', confidence: 0.6, probs: {}, action: null, t: Math.floor(Date.now() / 1000) - 30 },
    { symbol: this.symbol, close: 50200, ma5: 49200, ma20: 48200, rsi: 58, signal: 'WEAK BUY', confidence: 0.55, probs: {}, action: null, t: Math.floor(Date.now() / 1000) }
  ];

  testData.forEach(data => this.addRSI(data));
}



  }


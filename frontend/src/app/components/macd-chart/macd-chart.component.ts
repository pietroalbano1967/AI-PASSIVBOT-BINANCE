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
  ApexGrid,
  ApexLegend
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
  legend: ApexLegend;
};

@Component({
  selector: 'app-macd-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './macd-chart.component.html',
  styleUrls: ['./macd-chart.component.scss']
})
export class MacdChartComponent implements OnInit, OnDestroy, OnChanges {
  @Input() symbol: string = 'BTCUSDT';
  private subscription?: Subscription;
  public chartOptions: ChartOptions;
  public hasData: boolean = false;
  public loading: boolean = true;
  public errorMessage: string = '';

  constructor(
    private signalsService: SignalsService,
    private cdr: ChangeDetectorRef
  ) {
    this.chartOptions = this.createChartOptions();
  }

  ngOnInit() {
    console.log('📊 MACD Chart initialized for:', this.symbol);
    this.connectToSignals();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      console.log('🔄 Symbol changed to:', this.symbol);
      this.disconnect();
      this.chartOptions = this.createChartOptions();
      this.hasData = false;
      this.loading = true;
      this.errorMessage = '';
      this.connectToSignals();
    }
  }

  ngOnDestroy() {
    this.disconnect();
    console.log('📊 MACD Chart destroyed');
  }

  public connectToSignals() {
    console.log(`🔗 Connecting to signals for ${this.symbol}`);
    
    this.subscription = this.signalsService.connect(this.symbol).subscribe({
      next: (data: SignalData) => {
        console.log('📡 MACD Data received:', data);
        this.addMACDData(data);
      },
      error: (err) => {
        console.error('❌ MACD Chart connection error:', err);
        this.errorMessage = 'Errore di connessione al servizio segnali';
        this.loading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        console.log('✅ MACD Chart connection completed');
        this.loading = false;
        this.cdr.detectChanges();
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
          name: 'MACD Line',
          type: 'line',
          data: []
        },
        {
          name: 'Signal Line',
          type: 'line',
          data: []
        },
        {
          name: 'Histogram',
          type: 'column',
          data: []
        }
      ],
      chart: {
        type: 'line',
        height: 350,
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
        labels: { style: { colors: '#9ca3af' } },
        title: { text: 'MACD Value', style: { color: '#9ca3af' } }
      },
      stroke: {
        curve: 'smooth',
        width: 2,
        colors: ['#00E396', '#FEB019', '#FF4560']
      },
      title: {
        text: `MACD (12,26,9) - ${this.symbol}`,
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
      },
      legend: {
        labels: {
          colors: '#e0e0e0'
        }
      }
    };
  }

  private addMACDData(data: SignalData) {
    console.log('📊 MACD Data received:', data);
    
    if (!data.macd) {
      console.warn('⚠️ MACD data missing from signal');
      return;
    }

    const timestamp = new Date(data.t * 1000);

    // Aggiorna le serie
    const macdLineData = [...(this.chartOptions.series[0].data as any[])];
    const signalLineData = [...(this.chartOptions.series[1].data as any[])];
    const histogramData = [...(this.chartOptions.series[2].data as any[])];

    macdLineData.push({ x: timestamp, y: data.macd.macd });
    signalLineData.push({ x: timestamp, y: data.macd.signal });
    histogramData.push({ x: timestamp, y: data.macd.hist });

    // Mantieni solo gli ultimi 50 punti
    if (macdLineData.length > 50) {
      macdLineData.shift();
      signalLineData.shift();
      histogramData.shift();
    }

    this.chartOptions = {
      ...this.chartOptions,
      series: [
        {
          name: 'MACD Line',
          type: 'line',
          data: macdLineData
        },
        {
          name: 'Signal Line',
          type: 'line',
          data: signalLineData
        },
        {
          name: 'Histogram',
          type: 'column',
          data: histogramData
        }
      ],
      title: {
        ...this.chartOptions.title,
        text: `MACD (12,26,9) - ${this.symbol} - MACD: ${data.macd.macd.toFixed(4)}`
      }
    };

    this.hasData = macdLineData.length > 0;
    this.loading = false;
    this.cdr.detectChanges();
  }
   // Aggiungi questo metodo pubblico
retryConnection() {
  this.errorMessage = '';
  this.loading = true;
  this.disconnect();
  this.connectToSignals();
}
  // Rimuovi completamente il metodo addTestData()
}
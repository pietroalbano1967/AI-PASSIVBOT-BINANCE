import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexTooltip
} from 'ng-apexcharts';
import { CandleService } from '../../services/candle.service';
import { Subscription } from 'rxjs';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-volume-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './volume-chart.component.html',
  styleUrls: ['./volume-chart.component.scss']
})
export class VolumeChartComponent implements OnInit, OnDestroy {
  @Input() symbol: string = 'BTCUSDT';
  private historicalSubscription!: Subscription;
  private wsSubscription!: Subscription;

  public chartOptions: ChartOptions = {
    series: [
      {
        name: 'Volume',
        data: []
      }
    ],
    chart: {
      type: 'bar',
      height: 300,
      background: '#1a1d29',
      foreColor: '#e0e0e0',
      animations: { enabled: false },
      toolbar: { show: true }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#9ca3af' } }
    },
    yaxis: {
      labels: { style: { colors: '#9ca3af' } },
      title: { text: 'Volume', style: { color: '#9ca3af' } }
    },
    title: {
      text: 'Volume',
      align: 'center',
      style: { color: '#e0e0e0' }
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy HH:mm:ss' }
    }
  };

  constructor(private candleService: CandleService) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.disconnect();
  }

  private loadData() {
    // 1. PRIMA carica dati storici
    this.historicalSubscription = this.candleService.getHistoricalData(this.symbol, 30).subscribe({
      next: (historicalData: any[]) => {
        console.log(`✅ Volume - Ricevute ${historicalData.length} candele storiche`);
        
        // Estrai i volumi dai dati storici
        const volumeData = historicalData.map(item => ({
          x: new Date(item.t),
          y: typeof item.v === 'number' ? item.v : parseFloat(item.v)
        }));
        
        this.updateChart(volumeData);
        
        // 2. POI connetti al WebSocket per dati real-time
        this.connectWebSocket();
      },
      error: (err) => {
        console.error('❌ Volume - Errore dati storici:', err);
        this.connectWebSocket(); // Prova comunque il WebSocket
      }
    });
  }

  private connectWebSocket() {
    try {
      const wsSubject = this.candleService.createWebSocket(this.symbol);
      
      this.wsSubscription = wsSubject.subscribe({
        next: (candle: any) => {
          this.handleNewCandle(candle);
        },
        error: (err) => {
          console.warn('⚠️ Volume - WebSocket non disponibile:', err);
        }
      });
    } catch (error) {
      console.warn('⚠️ Volume - Errore connessione WebSocket:', error);
    }
  }

  private handleNewCandle(candleData: any) {
    const volume = typeof candleData.v === 'number' ? candleData.v : parseFloat(candleData.v);
    const timestamp = new Date(candleData.t);
    
    // Aggiorna il chart con il nuovo volume
    const currentData = this.chartOptions.series[0].data as any[];
    const newData = [...currentData];
    
    // Cerca se esiste già un dato per questo timestamp
    const existingIndex = newData.findIndex(item => item.x.getTime() === timestamp.getTime());
    
    if (existingIndex !== -1) {
      newData[existingIndex] = { x: timestamp, y: volume };
    } else {
      newData.push({ x: timestamp, y: volume });
      
      // Mantieni massimo 50 dati
      if (newData.length > 50) {
        newData.shift();
      }
    }
    
    this.updateChart(newData);
  }

  private updateChart(data: any[]) {
    this.chartOptions = {
      ...this.chartOptions,
      series: [{ name: 'Volume', data: data }],
      title: {
        ...this.chartOptions.title,
        text: `Volume ${this.symbol} - ${data.length} dati`
      }
    };
  }

  private disconnect() {
    if (this.historicalSubscription) {
      this.historicalSubscription.unsubscribe();
    }
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }
}
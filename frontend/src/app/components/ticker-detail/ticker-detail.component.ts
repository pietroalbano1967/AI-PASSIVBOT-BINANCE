// ticker-detail.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService, CandleResponse } from '../../services/api.service';
import { ChartComponent, NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

@Component({
  selector: 'app-ticker-detail',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './ticker-detail.component.html',
  styleUrls: ['./ticker-detail.component.scss']
})
export class TickerDetailComponent implements OnInit {
  @ViewChild('chart') chart!: ChartComponent;
  
  symbol: string = '';
  tickerData: any = null;
  candles: CandleResponse[] = [];
  historicalData: any[] = [];
  chartHeight: number = 400;
  
  public chartOptions: Partial<ApexOptions> = {
    series: [{
      name: 'Prezzo',
      type: 'candlestick',
      data: []
    }],
    chart: {
      type: 'candlestick',
      height: this.chartHeight,
      background: '#1e222d',
      animations: { enabled: false },
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
      text: '', 
      align: 'left',
      style: { color: '#fff', fontSize: '16px' }
    },
    xaxis: { 
      type: 'datetime',
      labels: { style: { colors: '#ccc' } }
    },
    yaxis: { 
      tooltip: { enabled: true },
      labels: { style: { colors: '#ccc' } }
    },
    grid: {
      borderColor: '#2a2e39',
      strokeDashArray: 2
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#26a69a',
          downward: '#ef5350'
        }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        format: 'dd MMM yyyy'
      }
    }
  };

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.symbol = this.route.snapshot.paramMap.get('symbol') || '';
    
    // Calcola l'altezza del chart
    this.calculateChartHeight();
    
    // Recupera i dati passati dalla navigazione
    const navigation = window.history.state;
    if (navigation.tickerData) {
      this.tickerData = navigation.tickerData;
    }
    
    this.loadTickerDetails();
    this.loadHistoricalData();
  }

  private calculateChartHeight() {
    // Imposta un'altezza basata sulla dimensione della finestra
    this.chartHeight = Math.max(300, window.innerHeight * 0.6);
    
    if (this.chart) {
      this.chart.updateOptions({
        chart: { height: this.chartHeight }
      }, false, false);
    }
  }

  loadTickerDetails() {
    if (this.symbol) {
      this.api.getTicker(this.symbol).subscribe({
        next: (data) => {
          this.tickerData = {
            symbol: data.symbol,
            price: data.price,
            volume: data.volume,
            high: data.high,
            low: data.low,
            change: ((data.price - data.open) / data.open) * 100 || 0
          };
          this.chartOptions.title = { 
            text: `${this.symbol} Price Chart`, 
            align: 'left',
            style: { color: '#fff', fontSize: '16px' }
          };
        },
        error: (err) => {
          console.error('Errore nel caricamento dettagli ticker:', err);
        }
      });
    }
  }

  loadHistoricalData() {
    if (this.symbol) {
      this.api.getCandles(this.symbol, '1d', 30).subscribe({
        next: (data: CandleResponse[]) => {
          this.candles = data;
          this.updateChart();
        },
        error: (err) => {
          console.error('Errore nel caricamento dati storici:', err);
        }
      });
    }
  }

  updateChart() {
    const seriesData = this.candles.map(candle => ({
      x: new Date(candle.t * 1000),
      y: [candle.o, candle.h, candle.l, candle.c]
    }));

    this.chartOptions.series = [{
      name: 'Prezzo',
      type: 'candlestick',
      data: seriesData
    }];
  }

  goBack() {
    window.history.back();
  }
}
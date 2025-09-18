import { Component, OnInit } from '@angular/core';
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
  symbol: string = '';
  tickerData: any = null;
  candles: CandleResponse[] = [];
  historicalData: any[] = [];
  
  public chartOptions: Partial<ApexOptions> = {
    series: [{
      name: 'Prezzo',
      type: 'candlestick',
      data: []
    }],
    chart: {
      type: 'candlestick',
      height: 400,
      animations: { enabled: false }
    },
    title: { text: '', align: 'left' },
    xaxis: { type: 'datetime' },
    yaxis: { tooltip: { enabled: true } }
  };

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.symbol = this.route.snapshot.paramMap.get('symbol') || '';
    
    // Recupera i dati passati dalla navigazione
    const navigation = window.history.state;
    if (navigation.tickerData) {
      this.tickerData = navigation.tickerData;
    }
    
    this.loadTickerDetails();
    this.loadHistoricalData();
  }

 loadTickerDetails() {
  if (this.symbol) {
    this.api.getTicker(this.symbol).subscribe({
      next: (data) => {
        // Formatta i dati in modo uniforme
        this.tickerData = {
          symbol: data.symbol,
          price: data.price,
          volume: data.volume,
          high: data.high,
          low: data.low
        };
        this.chartOptions.title = { text: `${this.symbol} Price Chart`, align: 'left' };
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
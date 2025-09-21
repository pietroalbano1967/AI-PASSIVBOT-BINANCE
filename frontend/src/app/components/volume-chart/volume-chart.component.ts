import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { CandleService, Candle } from '../../services/candle.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-volume-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './volume-chart.component.html',
  styleUrls: ['./volume-chart.component.scss']
})
export class VolumeChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';

  private subscription?: Subscription;
  candles: Candle[] = [];

  chartOptions: {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
  } = {
    series: [{ name: 'Volume', data: [] }],
    chart: { type: 'bar', height: 200, background: '#1e222d' },
    xaxis: { type: 'datetime', labels: { style: { colors: '#ccc' } } },
    yaxis: { labels: { style: { colors: '#ccc' } } }
  };

  constructor(private candleService: CandleService) {}

  ngOnInit() {
    this.connectWS();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      this.disconnect();
      this.candles = [];
      this.connectWS();
    }
  }

  private connectWS() {
    this.subscription = this.candleService.connect(this.symbol).subscribe(c => {
      this.candles.push(c);
      if (this.candles.length > 100) this.candles.shift();
      this.updateChart();
    });
  }

  private updateChart() {
    const seriesData = this.candles.map(c => ({
      x: new Date(c.t * 1000),
      y: c.v
    }));
    if (this.chart) {
      this.chart.updateSeries([{ name: 'Volume', data: seriesData }], false);
    }
  }

  private disconnect() {
    if (this.subscription) this.subscription.unsubscribe();
    this.candleService.disconnect();
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { WsService } from '../../services/ws.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-macd-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './macd-chart.component.html',
  styleUrls: ['./macd-chart.component.scss']
})
export class MacdChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';

  private subscription?: Subscription;
  macdLine: any[] = [];
  signalLine: any[] = [];
  histogram: any[] = [];

  chartOptions: {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
  } = {
    series: [
      { name: 'MACD', data: [] },
      { name: 'Signal', data: [] },
      { name: 'Histogram', data: [] }
    ],
    chart: { type: 'line', height: 200, background: '#1e222d' },
    xaxis: { type: 'datetime', labels: { style: { colors: '#ccc' } } },
    yaxis: { labels: { style: { colors: '#ccc' } } }
  };

  constructor(private ws: WsService) {}

  ngOnInit() {
    this.connectWS();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      this.disconnect();
      this.macdLine = [];
      this.signalLine = [];
      this.histogram = [];
      this.connectWS();
    }
  }

  private connectWS() {
    this.subscription = this.ws
      .connect(`ws://localhost:8000/ws/signals?symbol=${this.symbol.toLowerCase()}`)
      .subscribe((data: any) => {
        if (data.macd) {
          const ts = new Date(data.t * 1000);
          this.macdLine.push({ x: ts, y: data.macd.macd });
          this.signalLine.push({ x: ts, y: data.macd.signal });
          this.histogram.push({ x: ts, y: data.macd.hist });

          if (this.macdLine.length > 100) {
            this.macdLine.shift();
            this.signalLine.shift();
            this.histogram.shift();
          }

          if (this.chart) {
            this.chart.updateSeries([
              { name: 'MACD', data: this.macdLine },
              { name: 'Signal', data: this.signalLine },
              { name: 'Histogram', data: this.histogram }
            ], false);
          }
        }
      });
  }

  private disconnect() {
    if (this.subscription) this.subscription.unsubscribe();
    this.ws.disconnect();
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

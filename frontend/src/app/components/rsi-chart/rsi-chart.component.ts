import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgApexchartsModule,
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip
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
};

@Component({
  selector: 'app-rsi-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './rsi-chart.component.html',
  styleUrls: ['./rsi-chart.component.scss']
})
export class RsiChartComponent implements OnInit, OnDestroy {
  @Input() symbol: string = 'BTCUSDT';
  private subscription?: Subscription;

  public chartOptions: ChartOptions = {
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
    toolbar: { show: true }
  },
  xaxis: { type: 'datetime' },
  yaxis: {
    min: 0,
    max: 100,
    labels: { style: { colors: '#9ca3af' } }
  },
  stroke: { curve: 'smooth', width: 2 },
  title: {
    text: 'RSI (14)',
    align: 'center',
    style: { color: '#e0e0e0' }
  },
  tooltip: { theme: 'dark' }
};

  constructor(private signalsService: SignalsService) {}

  ngOnInit() {
    this.subscription = this.signalsService.connect(this.symbol).subscribe((data: SignalData) => {
      this.addRSI(data);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.signalsService.disconnect();
  }

  private addRSI(data: SignalData) {
    const point = { x: new Date(data.t * 1000), y: data.rsi };
    const series = this.chartOptions.series?.[0].data as any[];

    series.push(point);
    if (series.length > 50) series.shift(); // max 50 punti

    this.chartOptions = {
      ...this.chartOptions,
      series: [{ name: 'RSI', data: [...series] }]
    };
  }
}

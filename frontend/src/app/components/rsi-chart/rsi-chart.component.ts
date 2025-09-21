import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle } from 'ng-apexcharts';
import { SignalsService, SignalData } from '../../services/signals.service';
import { Subscription } from 'rxjs';

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

  series: ApexAxisChartSeries = [{ name: 'RSI', data: [] as { x: Date; y: number }[] }];
  chart: ApexChart = { type: 'line', height: 250 };
  xaxis: ApexXAxis = { type: 'datetime' };
  title: ApexTitleSubtitle = { text: 'RSI (14)', align: 'center' };

  private rsiData: { x: Date; y: number }[] = [];

  constructor(private signals: SignalsService) {}

  ngOnInit() {
    this.subscription = this.signals.connect(this.symbol).subscribe((data: SignalData) => {
      if (data.rsi !== undefined && data.rsi !== null) {
        this.rsiData.push({ x: new Date(data.t * 1000), y: data.rsi });
        if (this.rsiData.length > 100) this.rsiData.shift();
        this.series = [{ name: 'RSI', data: [...this.rsiData] }];
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.signals.disconnect();
    }
  }
}

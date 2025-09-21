import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle } from 'ng-apexcharts';
import { SignalsService, SignalData } from '../../services/signals.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-macd-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './macd-chart.component.html',
  styleUrls: ['./macd-chart.component.scss']
})
export class MacdChartComponent implements OnInit, OnDestroy {
  @Input() symbol: string = 'BTCUSDT';
  private subscription?: Subscription;

  series: ApexAxisChartSeries = [
    { name: 'MACD', data: [] as { x: Date; y: number }[] },
    { name: 'Signal', data: [] as { x: Date; y: number }[] },
    { name: 'Histogram', data: [] as { x: Date; y: number }[] }
  ];
  chart: ApexChart = { type: 'line', height: 250 };
  xaxis: ApexXAxis = { type: 'datetime' };
  title: ApexTitleSubtitle = { text: 'MACD', align: 'center' };

  private macdData: { x: Date; y: number }[] = [];
  private signalData: { x: Date; y: number }[] = [];
  private histData: { x: Date; y: number }[] = [];

  constructor(private signals: SignalsService) {}

  ngOnInit() {
    this.subscription = this.signals.connect(this.symbol).subscribe((data: SignalData) => {
      if (data.macd) {
        const point = { x: new Date(data.t * 1000), y: data.macd.macd };
        const sig = { x: new Date(data.t * 1000), y: data.macd.signal };
        const hist = { x: new Date(data.t * 1000), y: data.macd.hist };

        this.macdData.push(point);
        this.signalData.push(sig);
        this.histData.push(hist);

        if (this.macdData.length > 100) {
          this.macdData.shift();
          this.signalData.shift();
          this.histData.shift();
        }

        this.series = [
          { name: 'MACD', data: [...this.macdData] },
          { name: 'Signal', data: [...this.signalData] },
          { name: 'Histogram', data: [...this.histData] }
        ];
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

import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis } from 'ng-apexcharts';
import { WsService } from '../../services/ws.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rsi-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './rsi-chart.component.html',
  styleUrls: ['./rsi-chart.component.scss']
})
export class RsiChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chart') chart!: ChartComponent;
  @Input() symbol: string = 'BTCUSDT';

  private subscription?: Subscription;
  rsiData: any[] = [];

  chartOptions: {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
  } = {
    series: [{ name: 'RSI', data: [] }],
    chart: { type: 'line', height: 200, background: '#1e222d' },
    xaxis: { type: 'datetime', labels: { style: { colors: '#ccc' } } },
    yaxis: { min: 0, max: 100, labels: { style: { colors: '#ccc' } } }
  };

  constructor(private ws: WsService) {}

  ngOnInit() {
    this.connectWS();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      this.disconnect();
      this.rsiData = [];
      this.connectWS();
    }
  }

  private connectWS() {
    this.subscription = this.ws
      .connect(`ws://localhost:8000/ws/signals?symbol=${this.symbol.toLowerCase()}`)
      .subscribe((data: any) => {
        if (data.rsi) {
          this.rsiData.push({ x: new Date(data.t * 1000), y: data.rsi });
          if (this.rsiData.length > 100) this.rsiData.shift();
          if (this.chart) {
            this.chart.updateSeries([{ name: 'RSI', data: this.rsiData }], false);
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

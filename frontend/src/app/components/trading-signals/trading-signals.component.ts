import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { DashboardStateService } from '../../services/dashboard-state.service';

@Component({
  selector: 'app-trading-signals',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './trading-signals.component.html',
  styleUrls: ['./trading-signals.component.scss']
})
export class TradingSignalsComponent implements OnInit, OnDestroy {
  public rsiChartOptions: Partial<ApexOptions> = {
    series: [{ name: 'RSI', data: [] }],
    chart: { type: 'line', height: 200, background: '#1e222d' },
    xaxis: { type: 'datetime', labels: { style: { colors: '#ccc' } } },
    yaxis: {
      min: 0,
      max: 100,
      labels: { style: { colors: '#ccc' } }
    },
    stroke: { width: 2, curve: 'smooth' },
    colors: ['#1976d2'],
    annotations: {
      yaxis: [
        { y: 70, borderColor: '#ef5350', label: { text: 'Overbought', style: { color: '#fff', background: '#ef5350' } } },
        { y: 30, borderColor: '#26a69a', label: { text: 'Oversold', style: { color: '#fff', background: '#26a69a' } } }
      ]
    }
  };

  private interval?: any;

  constructor(private stateService: DashboardStateService) {}

  ngOnInit() {
    // aggiorna ogni 3s gli ultimi valori RSI dal DashboardStateService
    this.interval = setInterval(() => this.updateRsiChart(), 3000);
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private updateRsiChart() {
    const state = this.stateService.getCurrentState();
    const rsiData = state.rsiData.slice(-50); // ultimi 50 valori
    this.rsiChartOptions = {
      ...this.rsiChartOptions,
      series: [{ name: 'RSI', data: rsiData }]
    };
  }
}

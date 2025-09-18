import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

import { OrdersService, Order } from '../../services/orders.service';
import { ApiService } from '../../services/api.service';
import { DashboardStateService } from '../../services/dashboard-state.service';

// Import dei componenti
import { CandleChartComponent } from '../candle-chart/candle-chart.component';
import { MiniTickerComponent } from '../mini-ticker/mini-ticker.component';

import { OrdersComponent } from '../orders/orders.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    CandleChartComponent,
    MiniTickerComponent,
    NgApexchartsModule,  
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  paginatedOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentSymbol: string = 'BTCUSDT';
  private ordersInterval?: any;

  // ✅ FIX: definito rsiChartOptions
  public rsiChartOptions: Partial<ApexOptions> = {
    series: [{ name: 'RSI', data: [] }],
    chart: { type: 'line', height: 150, background: '#1e222d' },
    xaxis: { type: 'datetime', labels: { style: { colors: '#ccc' } } },
    yaxis: {
      min: 0,
      max: 100,
      labels: { style: { colors: '#ccc' } }
    },
    stroke: { width: 2, curve: 'smooth' },
    colors: ['#1976d2']
  };

  constructor(
    private api: ApiService,
    private ordersService: OrdersService,
    private router: Router,
    private stateService: DashboardStateService
  ) {}

  ngOnInit() {
    console.log('📈 Dashboard inizializzata');
    this.loadOrders();
    this.ordersInterval = setInterval(() => this.loadOrders(), 5000);
  }

  ngOnDestroy() {
    if (this.ordersInterval) clearInterval(this.ordersInterval);
    console.log('📋 Dashboard distrutta');
  }

  loadOrders() {
    this.ordersService.getOrders().subscribe((res) => {
      const orders = res.orders.sort((a, b) => b.t - a.t);
      this.stateService.updateState({ orders });
      this.updatePaginatedOrders();
    });
  }
  
// dashboard.component.ts
onSymbolSelected(symbol: string) {
  console.log("📊 Nuovo simbolo selezionato:", symbol);
  this.currentSymbol = symbol.toUpperCase();
  
  // Forza il cambio detection e il reload del componente candele
  setTimeout(() => {
    // Questo assicura che Angular rilevi il cambio e distrugga/ricrei il componente
    this.currentSymbol = symbol.toUpperCase();
  }, 0);
}



  reloadModel() {
    this.api.reloadModel().subscribe({
      next: (res) => {
        console.log('✅ Modello ricaricato:', res);
        alert('✅ Modello AI ricaricato con successo!');
      },
      error: (err) => {
        console.error('❌ Errore ricarico modello:', err);
        alert('❌ Errore durante il ricarico del modello');
      }
    });
  }

  updatePaginatedOrders() {
    const state = this.stateService.getCurrentState();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = state.orders.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedOrders();
  }

  get totalPages(): number {
    const state = this.stateService.getCurrentState();
    return Math.ceil(state.orders.length / this.itemsPerPage);
  }

  navigateToTickerDetail(ticker: any) {
    this.router.navigate(['/ticker', ticker.s], { state: { tickerData: ticker } });
  }

  forceDisconnect() {
    this.stateService.clearState();
    console.log('🔄 Reset completo della dashboard');
    this.loadOrders();
  }

  get state() {
    return this.stateService.getCurrentState();
  }

  trackByOrder(index: number, item: any): any {
    return item.id;
  }
}

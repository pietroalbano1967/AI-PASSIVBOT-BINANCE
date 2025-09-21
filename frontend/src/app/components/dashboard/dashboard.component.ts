import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandleChartComponent } from '../candle-chart/candle-chart.component';
import { VolumeChartComponent } from '../volume-chart/volume-chart.component';
import { RsiChartComponent } from '../rsi-chart/rsi-chart.component';
import { MacdChartComponent } from '../macd-chart/macd-chart.component';
import { WsService } from '../../services/ws.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { DashboardState } from '../../services/dashboard-state.service';
import { Order } from '../../services/orders.service';
import { OrdersService } from '../../services/orders.service';
import { ApiService } from '../../services/api.service';
import { ApexOptions } from 'apexcharts';
import { CandleService } from '../../services/candle.service';
import { Candle } from '../../services/candle.service';
import { MiniTickerComponent } from '../../components/mini-ticker/mini-ticker.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CandleChartComponent,
    VolumeChartComponent,
    RsiChartComponent,
    MacdChartComponent,
    MiniTickerComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  paginatedOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentSymbol: string = 'BTCUSDT';
  isLoading: boolean = false; // Aggiunta proprietà isLoading
  private ordersInterval?: any;

  constructor(
    private api: ApiService,
    private ws: WsService,
    private ordersService: OrdersService,
    private router: Router,
    private stateService: DashboardStateService,
    private cdr: ChangeDetectorRef
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

  onSymbolSelected(symbol: string) {
    console.log("📊 Nuovo simbolo selezionato:", symbol);
    this.isLoading = true;
    this.currentSymbol = symbol.toUpperCase();
    
    this.stateService.updateState({ currentSymbol: this.currentSymbol });
    
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 1000);
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

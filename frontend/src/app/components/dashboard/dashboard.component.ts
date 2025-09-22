// dashboard.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// ✅ IMPORT COMPONENTI
import { CandleChartComponent } from '../candle-chart/candle-chart.component';
import { VolumeChartComponent } from '../volume-chart/volume-chart.component';
import { RsiChartComponent } from '../rsi-chart/rsi-chart.component';
import { MacdChartComponent } from '../macd-chart/macd-chart.component';
import { MiniTickerComponent } from '../mini-ticker/mini-ticker.component';
import { AiSignalsComponent } from '../ai-signals/ai-signals.component';

// ✅ IMPORT SERVIZI
import { ApiService } from '../../services/api.service';
import { WsService } from '../../services/ws.service';
import { OrdersService, Order } from '../../services/orders.service';
import { SignalsService, SignalData } from '../../services/signals.service';
import { DashboardStateService } from '../../services/dashboard-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CandleChartComponent,
    VolumeChartComponent,
    RsiChartComponent,
    MacdChartComponent,
    MiniTickerComponent,
    AiSignalsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  paginatedOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  currentSymbol: string = 'BTCUSDT';
  isLoading: boolean = false;
  simulationEnabled: boolean = true;
  signals: SignalData[] = [];
  
  private ordersInterval?: any;
  private signalsSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private hasInitialized = false;
  private lastRoute = '';

  constructor(
    private api: ApiService,
    private ws: WsService,
    private ordersService: OrdersService,
    private router: Router,
    private signalsService: SignalsService,
    private stateService: DashboardStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('📈 Dashboard inizializzata');
    this.initializeDashboard();
    this.setupRouterListener();
  }

  // ✅ ASCOLTA GLI EVENTI DI NAVIGAZIONE DEL ROUTER
  private setupRouterListener() {
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        const currentUrl = event.urlAfterRedirects || event.url;
        console.log('🔄 Navigazione verso:', currentUrl);
        
        // ✅ SALVA L'ULTIMA ROTTA
        this.lastRoute = currentUrl;
        
        // ✅ SE SI TORNA ALLA DASHBOARD, FA REFRESH
        if (this.isDashboardRoute(currentUrl)) {
          this.handleDashboardNavigation();
        }
      });
  }

  // ✅ CONTROLLA SE LA ROTTA È LA DASHBOARD
  private isDashboardRoute(url: string): boolean {
    return url === '/' || 
           url === '/dashboard' || 
           url.startsWith('/dashboard');
  }

  // ✅ GESTISCE LA NAVIGAZIONE VERSO LA DASHBOARD
  private handleDashboardNavigation() {
    if (this.hasInitialized) {
      // ✅ ASPETTA UN ATTIMO PRIMA DEL REFRESH
      setTimeout(() => {
        console.log('🔄 Ritorno alla dashboard - FORZA REFRESH!');
        this.forceRefresh();
      }, 300);
    }
  }

  private initializeDashboard() {
    this.isLoading = true;
    this.hasInitialized = true;
    
    console.log('🚀 Inizializzazione dashboard...');
    
    // 1. Reset dello stato
    this.currentSymbol = 'BTCUSDT';
    this.signals = [];
    this.paginatedOrders = [];
    
    // 2. Carica ordini
    this.loadOrders();
    
    // 3. Connetti ai segnali
    this.connectToSignals();
    
    // 4. Avvia aggiornamento periodico ordini
    this.ordersInterval = setInterval(() => this.loadOrders(), 5000);
    
    // 5. Fine caricamento
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
      console.log('✅ Dashboard inizializzata');
    }, 1000);
  }

  ngOnDestroy() {
    this.cleanup();
    console.log('📋 Dashboard distrutta');
  }

  private cleanup() {
    this.hasInitialized = false;
    
    if (this.ordersInterval) {
      clearInterval(this.ordersInterval);
      this.ordersInterval = undefined;
    }
    
    if (this.signalsSubscription) {
      this.signalsSubscription.unsubscribe();
      this.signalsSubscription = undefined;
    }
    
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
      this.routerSubscription = undefined;
    }
    
    this.signalsService.disconnect();
  }

  // ✅ METODO PUBBLICO PER REFRESH
  forceRefresh() {
    console.log('🔄 FORCE REFRESH della dashboard');
    this.cleanup();
    
    // Delay per assicurarsi che la pulizia sia completata
    setTimeout(() => {
      this.initializeDashboard();
    }, 100);
  }

  connectToSignals() {
    // Disconnette eventuali connessioni precedenti
    if (this.signalsSubscription) {
      this.signalsSubscription.unsubscribe();
    }

    console.log(`🔗 Connessione signals per: ${this.currentSymbol}`);
    
    this.signalsSubscription = this.signalsService.connect(this.currentSymbol).subscribe({
      next: (signal: SignalData) => {
        // Ignora i messaggi di connessione
        if (signal.signal === 'CONNESSIONE STABILITA') return;
        
        this.signals.unshift(signal);
        
        // Mantieni solo gli ultimi 50 segnali
        if (this.signals.length > 50) {
          this.signals.pop();
        }
        
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('❌ Errore connessione signals:', err);
      },
      complete: () => {
        console.log('✅ Signals subscription completata');
      }
    });
  }

  onSimulationToggled(enabled: boolean) {
    this.simulationEnabled = enabled;
    this.signalsService.setSimulationEnabled(enabled);
    console.log(`🎛 Simulazione ${enabled ? 'abilitata' : 'disabilitata'}`);
  }

  loadOrders() {
    if (!this.hasInitialized) return;
    
    this.ordersService.getOrders().subscribe({
      next: (res: any) => {
        const orders = res.orders.sort((a: Order, b: Order) => b.t - a.t);
        this.stateService.updateState({ orders });
        this.updatePaginatedOrders();
      },
      error: (err: any) => {
        console.error('❌ Errore caricamento ordini:', err);
      }
    });
  }

  onSymbolSelected(symbol: string) {
    console.log("📊 Nuovo simbolo selezionato:", symbol);
    this.isLoading = true;
    this.currentSymbol = symbol.toUpperCase();
    this.refreshForNewSymbol();
  }

  private refreshForNewSymbol() {
    console.log(`🔄 Refresh per nuovo simbolo: ${this.currentSymbol}`);
    
    // Disconnette i vecchi signals
    if (this.signalsSubscription) {
      this.signalsSubscription.unsubscribe();
    }
    
    // Resetta i dati
    this.signals = [];
    
    // Riconnette per il nuovo simbolo
    this.connectToSignals();
    
    // Fine caricamento
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 1500);
  }

  reloadModel() {
    this.api.reloadModel().subscribe({
      next: (res: any) => {
        console.log('✅ Modello ricaricato:', res);
        alert('✅ Modello AI ricaricato con successo!');
      },
      error: (err: any) => {
        console.error('❌ Errore ricarico modello:', err);
        alert('❌ Errore durante il ricarico del modello');
      }
    });
  }

  updatePaginatedOrders() {
    const state = this.stateService.getCurrentState();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = state.orders ? state.orders.slice(startIndex, endIndex) : [];
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedOrders();
  }

  get totalPages(): number {
    const state = this.stateService.getCurrentState();
    return state.orders ? Math.ceil(state.orders.length / this.itemsPerPage) : 0;
  }

  navigateToTickerDetail(ticker: any) {
    this.router.navigate(['/ticker', ticker.s], { state: { tickerData: ticker } });
  }

  // ✅ METODO PER NAVIGARE ALLE ALTRE PAGINE
  navigateToBacktest() {
    this.router.navigate(['/backtest']);
  }

  navigateToOptimize() {
    this.router.navigate(['/optimize']);
  }

  navigateToResults() {
    this.router.navigate(['/results']);
  }

  navigateToOrders() {
    this.router.navigate(['/orders']);
  }

  get state() {
    return this.stateService.getCurrentState();
  }

  trackByOrder(index: number, item: any): any {
    return item.id;
  }

  // ✅ METODO DI DEBUG
  debugInfo() {
    console.log('🐛 Debug Dashboard:', {
      initialized: this.hasInitialized,
      currentSymbol: this.currentSymbol,
      signalsCount: this.signals.length,
      isLoading: this.isLoading,
      lastRoute: this.lastRoute
    });
  }
}
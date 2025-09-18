import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OrdersService, Order } from '../../services/orders.service';
import {
  ChartComponent,
  NgApexchartsModule,
  ApexOptions
} from 'ng-apexcharts';
import { ApiService, CandleResponse, TickerResponse } from '../../services/api.service';
import { WsService } from '../../services/ws.service';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { MatSnackBar } from '@angular/material/snack-bar';  

interface CandleData {
  x: Date;
  y: [number, number, number, number]; // [open, high, low, close]
}

interface MaData {
  x: Date;
  y: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chart') chart!: ChartComponent;

  paginatedOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  mode: 'rest' | 'ws' = 'ws';
  currentSymbol: string = 'BTCUSDT';

  public chartOptions: Partial<ApexOptions>;
  public rsiChartOptions: Partial<ApexOptions>;

  // 🔓 reso pubblico per l’HTML
  wsCandle?: WebSocket;
  private wsTickers?: WebSocket;
  private wsSignals?: WebSocket;
  private restInterval?: any;
  private ordersInterval?: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private api: ApiService, 
    private wsService: WsService, 
    private ordersService: OrdersService,
    private router: Router,
    private stateService: DashboardStateService
  ) {
    this.chartOptions = this.createChartOptions();
    this.rsiChartOptions = this.createRsiChartOptions();
  }

  ngOnInit() {
    console.log('📈 Dashboard inizializzata');

    this.stateService.state$.subscribe(() => {
      this.updateChart();
      this.updateRsiChart();
    });

    this.initializeDashboard();
  }

  private initializeDashboard() {
    const currentState = this.stateService.getCurrentState();
    this.currentSymbol = currentState.currentSymbol || 'BTCUSDT';

     // Se non ci sono ticker, aggiungi il ticker predefinito
  if (currentState.tickers.length === 0) {
    const defaultTicker = {
      s: this.currentSymbol,
      c: 0,
      v: 0,
      h: 0,
      l: 0,
      o: 0
    };
    this.stateService.updateState({ tickers: [defaultTicker] });
  

      if (this.mode === 'ws') {
        this.connectWebSockets();
      }
    } else {
      console.log('🚀 Avvio nuova dashboard');
      this.toggleMode('ws');
    }

    this.loadOrders();
    this.ordersInterval = setInterval(() => this.loadOrders(), 5000);
  }

  private createChartOptions(): Partial<ApexOptions> {
    return {
      series: [
        { name: 'Candles', type: 'candlestick', data: [] },
        { name: 'MA20', type: 'line', data: [] }
      ],
      chart: {
        type: 'candlestick',
        height: 350,
        background: '#fff',
        animations: { enabled: false },
        toolbar: { show: true },
        zoom: { enabled: true }
      },
      title: { text: 'Price Chart', align: 'left' },
      xaxis: { type: 'datetime' },
      yaxis: {
        tooltip: { enabled: true },
        opposite: true
      },
      plotOptions: {
        candlestick: {
          colors: { upward: '#26a69a', downward: '#ef5350' }
        }
      },
      stroke: {
        width: [1, 2],
        colors: ['#000000', '#FF9900']
      },
      legend: { show: true, position: 'top' },
      annotations: { points: [] } // ✅ inizializzato
    };
  }

  private createRsiChartOptions(): Partial<ApexOptions> {
    return {
      series: [{ name: 'RSI', data: [] }],
      chart: { type: 'line', height: 150, background: '#fff', animations: { enabled: false } },
      title: { text: 'RSI Indicator', align: 'left' },
      xaxis: { type: 'datetime' },
      yaxis: {
        min: 0, max: 100, tickAmount: 5,
        labels: { formatter: (val: number) => val.toFixed(0) }
      },
      stroke: { width: 2, curve: 'smooth' },
      annotations: {
        yaxis: [
          { y: 70, borderColor: '#ef5350', label: { borderColor: '#ef5350', style: { color: '#fff', background: '#ef5350' }, text: 'Overbought' } },
          { y: 30, borderColor: '#26a69a', label: { borderColor: '#26a69a', style: { color: '#fff', background: '#26a69a' }, text: 'Oversold' } }
        ]
      },
      colors: ['#1976d2']
    };
  }

  loadOrders() {
    this.ordersService.getOrders().subscribe((res) => {
      const orders = res.orders.sort((a, b) => b.t - a.t);
      this.stateService.updateState({ orders });
      this.updatePaginatedOrders();
    });
  }

  reloadModel() {
  this.api.reloadModel().subscribe({
    next: (res) => {
      console.log("✅ Modello ricaricato:", res);
      alert("✅ Modello AI ricaricato con successo!");
    },
    error: (err) => {
      console.error("❌ Errore ricarico modello:", err);
      alert("❌ Errore durante il ricarico del modello");
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

  toggleMode(mode: 'rest' | 'ws') {
    this.mode = mode;
    this.disconnectWs();
    if (this.restInterval) clearInterval(this.restInterval);

    if (mode === 'rest') {
      this.loadRest();
      this.restInterval = setInterval(() => this.loadRest(), 5000);
    } else {
      this.connectWebSockets();
    }
  }

  private connectWebSockets() {
    this.connectCandles(this.currentSymbol);
    this.connectTickers();
    this.connectSignals(this.currentSymbol);
  }

  connectCandles(symbol: string) {
  if (this.wsCandle) this.wsCandle.close();

  this.wsCandle = new WebSocket(`ws://127.0.0.1:8000/ws/candles1s?symbol=${symbol.toLowerCase()}`);

  this.wsCandle.onopen = () => {
    console.log(`✅ WS candles connesso per ${symbol}`);
    this.reconnectAttempts = 0;
  };

  this.wsCandle.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // ✅ Verifica che i dati siano nel formato corretto
      if (!data || typeof data !== 'object') {
        console.warn("Dati candela non validi:", data);
        return;
      }

      const candle: CandleData = {
        x: new Date(data.t * 1000),
        y: [
          data.o || data.open || 0,
          data.h || data.high || 0,
          data.l || data.low || 0,
          data.c || data.close || 0
        ] as [number, number, number, number]
      };

      const state = this.stateService.getCurrentState();
      const existingIndex = state.candles.findIndex(c => c.x.getTime() === candle.x.getTime());
      let newCandles = [...state.candles];

      if (existingIndex >= 0) {
        newCandles[existingIndex] = candle;
      } else {
        newCandles.push(candle);
      }

      // ✅ tieni solo le ultime 100 candele
      newCandles = newCandles.slice(-100);

      this.stateService.updateState({ candles: newCandles });
      this.calculateMA20(newCandles);
      this.updateChart();

    } catch (e) {
      console.error('❌ Errore parsing candela:', e, event.data);
    }
  };

  this.wsCandle.onerror = (error) => {
    console.error('❌ Errore WS candles:', error);
    this.handleReconnection('candles');
  };

  this.wsCandle.onclose = () => {
    this.handleReconnection('candles');
  };
}


  private calculateMA20(candles: CandleData[]) {
  const ma20Data: MaData[] = [];

  if (candles.length >= 20) {
    for (let i = 19; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) {
        sum += candles[j].y[3]; // usa il close
      }
      ma20Data.push({ x: candles[i].x, y: sum / 20 });
    }
  }

  // ✅ mantieni massimo 100 punti MA20
  this.stateService.updateState({ ma20Data: ma20Data.slice(-100) });
}


  private updateChart() {
  const state = this.stateService.getCurrentState();
  if (this.chart && this.chartOptions.series) {
    this.chart.updateOptions({
      series: [
        { name: 'Candles', type: 'candlestick', data: state.candles.slice(-100) }, // ✅ max 100
        { name: 'MA20', type: 'line', data: state.ma20Data.slice(-100) }
      ],
      annotations: this.chartOptions.annotations
    }, false, true);
  }
}


  // dashboard.component.ts - MODIFICA la funzione connectTickers()
// dashboard.component.ts - modifica la funzione connectTickers
connectTickers() {
  if (this.wsTickers) this.wsTickers.close();

  this.wsTickers = new WebSocket(`ws://localhost:8000/ws/tickers`);

  this.wsTickers.onopen = () => {
    console.log("✅ WS tickers connesso");
  };

  this.wsTickers.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Formatta il ticker in modo uniforme
      const ticker = {
        s: data.s || data.symbol,
        c: data.c || data.price,
        v: data.v || data.volume,
        h: data.h || data.high,
        l: data.l || data.low,
        o: data.o || data.openPrice || (data.c || data.price) // fallback
      };

      const state = this.stateService.getCurrentState();
      
      // Evita duplicati: rimuovi il ticker con lo stesso simbolo se esiste
      const newTickers = state.tickers.filter(t => t.s !== ticker.s);
      newTickers.unshift(ticker); // aggiungi in testa
      
      // Limita a 50 ticker
      this.stateService.updateState({ tickers: newTickers.slice(0, 50) });
    } catch (e) {
      console.error("❌ Errore parsing ticker:", e, event.data);
    }
  };

  this.wsTickers.onerror = (err) => {
    console.error("❌ Errore WS tickers:", err);
  };

  this.wsTickers.onclose = () => {
    console.warn("⚠️ WS tickers chiuso, tentativo di riconnessione...");
    setTimeout(() => this.connectTickers(), 5000);
  };
}

private ensureDefaultSymbol() {
  const state = this.stateService.getCurrentState();
  
  // Se non ci sono ticker, aggiungi quello predefinito
  if (state.tickers.length === 0) {
    const defaultTicker = {
      s: this.currentSymbol,
      c: 0,
      v: 0,
      h: 0,
      l: 0,
      o: 0
    };
    this.stateService.updateState({ tickers: [defaultTicker] });
  }
  
  // Assicurati che il simbolo corrente sia nei ticker
  const currentTicker = state.tickers.find(t => t.s === this.currentSymbol);
  if (!currentTicker) {
    const newTicker = {
      s: this.currentSymbol,
      c: 0,
      v: 0,
      h: 0,
      l: 0,
      o: 0
    };
    this.stateService.updateState({ 
      tickers: [newTicker, ...state.tickers].slice(0, 50) 
    });
  }
}
  connectSignals(symbol: string) {
  if (this.wsSignals) this.wsSignals.close();

  this.wsSignals = new WebSocket(`ws://localhost:8000/ws/signals?symbol=${symbol}`);
  this.wsSignals.onopen = () => this.reconnectAttempts = 0;

  this.wsSignals.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📡 Segnale AI:', data);

      const state = this.stateService.getCurrentState();

      // ✅ mantieni solo ultimi 50 segnali
      const newSignals = [data, ...state.signals].slice(0, 50);

      // ✅ mantieni solo ultimi 50 valori RSI
      let newRsiData = [...state.rsiData];
      if (data.rsi !== undefined) {
        newRsiData.push({ x: new Date(data.t * 1000), y: data.rsi });
        newRsiData = newRsiData.slice(-50);
      }

      this.stateService.updateState({ signals: newSignals, rsiData: newRsiData });

      // marker solo per segnali importanti
      if (data.confidence > 0.6 && (data.signal.includes('BUY') || data.signal.includes('SELL'))) {
        this.addSignalMarker(new Date(data.t * 1000), data.close, data.signal);
      }
    } catch (e) {
      console.error('❌ Errore parsing segnale:', e, event.data);
    }
  };

  this.wsSignals.onerror = () => this.handleReconnection('signals');
  this.wsSignals.onclose = () => this.handleReconnection('signals');
}



  private updateRsiChart() {
  const state = this.stateService.getCurrentState();

  if (this.rsiChartOptions.series) {
    // ✅ usa solo gli ultimi 50 valori RSI
    const limitedRsiData = state.rsiData.slice(-50);

    this.rsiChartOptions.series[0] = {
      name: 'RSI',
      type: 'line',
      data: limitedRsiData
    };

    // ✅ aggiorna il grafico solo se presente
    if (this.chart) {
      this.chart.updateOptions({
        series: this.rsiChartOptions.series
      }, false, true);
    }
  }
}


  private addSignalMarker(x: Date, y: number, signal: string) {
    const color = signal.includes('BUY') ? '#26a69a' : '#ef5350';
    const symbol = signal.includes('BUY') ? '🟢' : '🔴';
    const newPoint = {
      x: x.getTime(), y,
      marker: { size: 8, fillColor: color, strokeColor: '#FFF', strokeWidth: 2, shape: 'circle' },
      label: { borderColor: color, style: { color: '#fff', background: color }, text: `${symbol} ${signal}` }
    };
    const currentPoints = this.chartOptions.annotations?.points || [];
    this.chartOptions.annotations!.points = [...currentPoints.slice(-4), newPoint];
    if (this.chart) this.chart.updateOptions(this.chartOptions);
  }

  private handleReconnection(type: 'tickers' | 'candles' | 'signals') {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (type === 'tickers') this.connectTickers();
        if (type === 'candles') this.connectCandles(this.currentSymbol);
        if (type === 'signals') this.connectSignals(this.currentSymbol);
      }, 3000);
    } else {
      console.error(`❌ Riconnessione fallita per ${type}`);
      this.toggleMode('rest');
    }
  }

  loadRest() {
  this.api.getCandles(this.currentSymbol, '1m', 50).subscribe({
    next: (data: CandleResponse[]) => {
      const candles: CandleData[] = data.map(c => ({ x: new Date(c.t * 1000), y: [c.o, c.h, c.l, c.c] }));
      this.stateService.updateState({ candles });
      this.calculateMA20(candles);
    },
    error: (err) => console.error('❌ Errore caricamento candele REST:', err)
  });

  this.api.getTicker(this.currentSymbol).subscribe({
    next: (data: TickerResponse) => {
      const ticker = {
        s: data.symbol,
        c: data.price,
        v: data.volume,
        h: data.high,
        l: data.low,
        o: data.price // Usa il prezzo come open se non disponibile
      };
      
      const state = this.stateService.getCurrentState();
      // Sostituisci il ticker corrente se esiste, altrimenti aggiungilo
      const newTickers = state.tickers.filter(t => t.s !== ticker.s);
      newTickers.unshift(ticker);
      this.stateService.updateState({ tickers: newTickers.slice(0, 50) });
    },
    error: (err) => console.error('❌ Errore caricamento ticker REST:', err)
  });
}


  selectSymbol(symbol: string) {
  this.currentSymbol = symbol;
  this.stateService.updateState({ currentSymbol: symbol });
  
  // Aggiorna il ticker predefinito
  const state = this.stateService.getCurrentState();
  const existingTicker = state.tickers.find(t => t.s === symbol);
  if (!existingTicker) {
    const newTicker = {
      s: symbol,
      c: 0,
      v: 0,
      h: 0,
      l: 0,
      o: 0
    };
    this.stateService.updateState({ 
      tickers: [newTicker, ...state.tickers].slice(0, 50) 
    });
  }
  
  console.log(`🔁 Cambio simbolo: ${symbol}`);
  this.toggleMode(this.mode);
}

  disconnectWs() {
    if (this.wsCandle) { this.wsCandle.close(); this.wsCandle = undefined; }
    if (this.wsTickers) { this.wsTickers.close(); this.wsTickers = undefined; }
    if (this.wsSignals) { this.wsSignals.close(); this.wsSignals = undefined; }
  }

  forceDisconnect() {
    this.disconnectWs();
    this.stateService.clearState();
    console.log('🔄 Reset completo della dashboard');
    this.initializeDashboard();
  }

  ngOnDestroy() {
    if (this.restInterval) clearInterval(this.restInterval);
    if (this.ordersInterval) clearInterval(this.ordersInterval);
    console.log('📋 Dashboard distrutta, stato mantenuto');
  }

  getChangePercent(t: any): number {
  try {
    const close = parseFloat(t.c || t.price || t.lastPrice);
    const open = parseFloat(t.o || t.openPrice || close);
    if (!open || isNaN(open)) return 0;
    return ((close - open) / open) * 100;
  } catch { 
    return 0; 
  }
}

  getChangeClass(t: any): string {
    return this.getChangePercent(t) >= 0 ? 'positive' : 'negative';
  }

  formatVolume(volume: number): string {
    if (volume >= 1_000_000) return (volume / 1_000_000).toFixed(2) + 'M';
    if (volume >= 1_000) return (volume / 1_000).toFixed(2) + 'K';
    return volume.toFixed(2);
  }

  get state() {
    return this.stateService.getCurrentState();
  }
  trackByOrder(index: number, item: any): any {
  return item.id;
}

trackByTicker(index: number, item: any): any {
  return item.s;
}

}

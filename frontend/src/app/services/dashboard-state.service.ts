// services/dashboard-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DashboardState {
  candles: any[];
  tickers: any[];
  signals: any[];
  orders: any[];
  currentSymbol: string;
  ma20Data: any[];
  rsiData: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private stateSubject = new BehaviorSubject<DashboardState>({
    candles: [],
    tickers: [],
    signals: [],
    orders: [],
    currentSymbol: 'BTCUSDT',
    ma20Data: [],
    rsiData: []
  });

  state$ = this.stateSubject.asObservable();

  constructor() {
    // Recupera lo stato dal localStorage all'avvio
    const savedState = localStorage.getItem('dashboardState');
    if (savedState) {
      this.stateSubject.next(JSON.parse(savedState));
    }
  }

  updateState(partialState: Partial<DashboardState>) {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...partialState };
    this.stateSubject.next(newState);
    
    // Salva nello storage per persistenza
    localStorage.setItem('dashboardState', JSON.stringify(newState));
  }

  getCurrentState(): DashboardState {
    return this.stateSubject.value;
  }

  clearState() {
    const emptyState: DashboardState = {
      candles: [],
      tickers: [],
      signals: [],
      orders: [],
      currentSymbol: 'BTCUSDT',
      ma20Data: [],
      rsiData: []
    };
    this.stateSubject.next(emptyState);
    localStorage.removeItem('dashboardState');
  }
}
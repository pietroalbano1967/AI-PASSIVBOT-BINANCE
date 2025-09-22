// services/ticker-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Ticker } from './ticker.service';

@Injectable({
  providedIn: 'root'
})
export class TickerStateService {
  private tickersSubject = new BehaviorSubject<Ticker[]>([]);
  public tickers$ = this.tickersSubject.asObservable();
  
  // ✅ Aggiungi un getter pubblico per accedere al valore corrente
  public get currentTickers(): Ticker[] {
    return this.tickersSubject.value;
  }
  private isConnected = false;
  private shouldReconnect = true;

  constructor() {
    this.loadFromStorage();
  }

  // ✅ Aggiorna i tickers
  updateTickers(tickers: Ticker[]) {
    this.tickersSubject.next(tickers);
    this.saveToStorage(tickers);
  }

  // ✅ Aggiorna un singolo ticker
  updateTicker(newTicker: Ticker) {
    const currentTickers = this.tickersSubject.value;
    const index = currentTickers.findIndex(t => t.s === newTicker.s);
    
    let updatedTickers: Ticker[];
    if (index >= 0) {
      // Aggiorna ticker esistente
      updatedTickers = [...currentTickers];
      updatedTickers[index] = newTicker;
    } else {
      // Aggiungi nuovo ticker (massimo 15)
      updatedTickers = [newTicker, ...currentTickers].slice(0, 15);
    }
    
    this.updateTickers(updatedTickers);
  }

  // ✅ Carica da localStorage
  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('tickersState');
      if (saved) {
        const tickers = JSON.parse(saved);
        this.tickersSubject.next(tickers);
        console.log(`📂 Caricati ${tickers.length} tickers da storage`);
      }
    } catch (error) {
      console.error('❌ Errore caricamento tickers:', error);
    }
  }

  // ✅ Salva in localStorage
  private saveToStorage(tickers: Ticker[]) {
    try {
      localStorage.setItem('tickersState', JSON.stringify(tickers));
    } catch (error) {
      console.error('❌ Errore salvataggio tickers:', error);
    }
  }

  // ✅ Gestione connessione
  setConnectionStatus(connected: boolean) {
    this.isConnected = connected;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  setShouldReconnect(reconnect: boolean) {
    this.shouldReconnect = reconnect;
  }

  shouldAutoReconnect(): boolean {
    return this.shouldReconnect;
  }

  // ✅ Pulisci lo stato
  clear() {
    this.tickersSubject.next([]);
    localStorage.removeItem('tickersState');
  }
}
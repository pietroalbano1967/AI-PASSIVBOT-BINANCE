// services/ticker.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { TickerStateService } from './ticker-state.service';

export interface Ticker {
  s: string;
  c: number;
  o: number;
  h: number;
  l: number;
  v: number;
}

@Injectable({ providedIn: 'root' })
export class TickerService {
  private baseUrl = 'http://localhost:8000';
  private ws: WebSocket | null = null;
  private subject: Subject<Ticker> | null = null;
  private reconnectTimeout: any;

  constructor(
    private http: HttpClient,
    private tickerState: TickerStateService
  ) {}

  // ✅ Connessione WebSocket con stato condiviso
  connect(): Observable<Ticker> {
    // Se già connesso, ritorna l'observable esistente
    if (this.subject && !this.subject.closed && this.tickerState.getConnectionStatus()) {
      console.log('🔗 Riutilizzo connessione tickers esistente');
      return this.subject.asObservable();
    }

    this.disconnect();
    
    console.log('🔗 Nuova connessione WebSocket tickers...');
    this.subject = new Subject<Ticker>();
    this.tickerState.setConnectionStatus(false);

    const wsUrl = `ws://localhost:8000/ws/tickers`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket tickers connesso');
        this.tickerState.setConnectionStatus(true);
        this.tickerState.setShouldReconnect(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const ticker = JSON.parse(event.data) as Ticker;
          
          // ✅ Aggiorna lo stato condiviso
          this.tickerState.updateTicker(ticker);
          
          // ✅ Notifica i subscribers
          if (this.subject) {
            this.subject.next(ticker);
          }
        } catch (error) {
          console.error('❌ Errore parsing ticker:', error, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket tickers error:', error);
        this.tickerState.setConnectionStatus(false);
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket tickers chiuso:', event.code, event.reason);
        this.tickerState.setConnectionStatus(false);
        
        // ✅ Reconnessione automatica solo se necessario
        if (this.tickerState.shouldAutoReconnect()) {
          this.scheduleReconnection();
        }
      };

    } catch (error) {
      console.error('❌ Errore creazione WebSocket:', error);
      this.scheduleReconnection();
    }

    return this.subject.asObservable();
  }

  // ✅ Programmazione riconnessione
  private scheduleReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.tickerState.shouldAutoReconnect() && !this.tickerState.getConnectionStatus()) {
        console.log('🔄 Tentativo riconnessione tickers...');
        this.connect();
      }
    }, 3000);
  }

  // ✅ Disconnessione controllata
  disconnect() {
    this.tickerState.setShouldReconnect(false);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    if (this.subject) {
      this.subject.complete();
      this.subject = null;
    }
    
    console.log('🔌 TickerService disconnesso');
  }

  getTicker(symbol: string): Observable<Ticker> {
    return this.http.get<Ticker>(`${this.baseUrl}/tickers?symbol=${symbol}`);
  }

  // ✅ Forza riconnessione
  reconnect() {
    this.disconnect();
    this.tickerState.setShouldReconnect(true);
    setTimeout(() => this.connect(), 100);
  }
}
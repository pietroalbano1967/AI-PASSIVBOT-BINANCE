import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface Ticker {
  s: string; // symbol
  c: number; // close price
  o: number; // open price
  h: number; // high
  l: number; // low
  v: number; // volume
}

@Injectable({ providedIn: 'root' })
export class TickerService {
  private baseUrl = 'http://localhost:8000';
  private ws: WebSocket | null = null;
  private subject = new Subject<Ticker>();

  constructor(private http: HttpClient) {}

  // WS per tutti i tickers
  connect(): Observable<Ticker> {
    this.disconnect();
    
    const wsUrl = `ws://localhost:8000/ws/tickers`;
    console.log('🔗 Connessione a:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connesso per tickers');
    };

    this.ws.onmessage = (event) => {
      try {
        const ticker = JSON.parse(event.data) as Ticker;
        console.log('📡 Dati ticker ricevuti:', ticker);
        this.subject.next(ticker);
      } catch (error) {
        console.error('❌ Errore parsing ticker:', error, event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.subject.error(error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket chiuso');
      this.subject.complete();
    };

    return this.subject.asObservable();
  }

  // REST
  getTicker(symbol: string): Observable<Ticker> {
    return this.http.get<Ticker>(`${this.baseUrl}/tickers?symbol=${symbol}`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
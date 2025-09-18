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
  private ws?: WebSocket;
  private subject = new Subject<Ticker>();

  constructor(private http: HttpClient) {}
  // WS filtrato per singolo simbolo
connectMiniTicker(symbol: string): Observable<Ticker> {
  // se hai un endpoint WS dedicato per singolo symbol
  // es: ws://localhost:8000/ws/ticker?symbol=BTCUSDT
  this.ws = new WebSocket(`ws://localhost:8000/ws/ticker?symbol=${symbol}`);

  this.ws.onmessage = (event) => {
    const ticker = JSON.parse(event.data) as Ticker;
    if (ticker.s === symbol) {
      this.subject.next(ticker);
    }
  };

  return this.subject.asObservable();
}

  // REST
  getTicker(symbol: string): Observable<Ticker> {
    return this.http.get<Ticker>(`${this.baseUrl}/tickers?symbol=${symbol}`);
  }

  // WS
  connect(): Observable<Ticker> {
    this.ws = new WebSocket(`ws://localhost:8000/ws/tickers`);
    this.ws.onmessage = (event) => {
      const ticker = JSON.parse(event.data) as Ticker;
      this.subject.next(ticker);
    };
    return this.subject.asObservable();
  }

  disconnect() {
    this.ws?.close();
  }
}

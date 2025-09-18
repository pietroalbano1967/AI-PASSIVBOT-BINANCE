import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface Candle {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

@Injectable({ providedIn: 'root' })
export class CandleService {
  private baseUrl = 'http://localhost:8000';
  private ws?: WebSocket;
  private subject = new Subject<Candle>();

  constructor(private http: HttpClient) {}

  // REST: ultime candele
  getCandles(symbol: string, interval: string = '1m', limit: number = 50): Observable<Candle[]> {
    return this.http.get<Candle[]>(`${this.baseUrl}/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  }

  // WS: streaming candele in tempo reale
  connect(symbol: string): Observable<Candle> {
    this.ws = new WebSocket(`ws://localhost:8000/ws/candles1s?symbol=${symbol.toLowerCase()}`);
    this.ws.onmessage = (event) => {
      const candle = JSON.parse(event.data) as Candle;
      this.subject.next(candle);
    };
    return this.subject.asObservable();
  }

  disconnect() {
    this.ws?.close();
  }
}

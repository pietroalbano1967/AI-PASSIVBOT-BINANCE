import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface Candle {
  t: number;
  s?: string;
  symbol?: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

@Injectable({ providedIn: 'root' })
export class CandleService {
  private baseUrl = 'http://localhost:8000';
  private ws: WebSocket | null = null;
  private subject = new Subject<Candle>();

  constructor(private http: HttpClient) {}

  // ✅ WS: streaming in tempo reale
  connect(symbol: string): Observable<Candle> {
    // Chiudi connessione esistente
    this.disconnect();
    
    const wsUrl = `ws://localhost:8000/ws/candles1s?symbol=${symbol.toLowerCase()}`;
    console.log('🔗 Connessione a:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connesso per candele');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Dati candela ricevuti:', data);

        const candle: Candle = {
          t: data.t || Math.floor(Date.now() / 1000),
          s: data.s,
          symbol: data.symbol || data.s,
          o: parseFloat(data.o) || 0,
          h: parseFloat(data.h) || 0,
          l: parseFloat(data.l) || 0,
          c: parseFloat(data.c) || 0,
          v: parseFloat(data.v) || 0
        };

        this.subject.next(candle);
      } catch (error) {
        console.error('❌ Errore parsing candela:', error, event.data);
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

  testConnection(): Observable<any> {
    return this.http.get(`${this.baseUrl}/test/connection`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
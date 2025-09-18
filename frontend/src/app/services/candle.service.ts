import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Candle {
  t: number;
  s?: string;      // Binance-style (WS)
  symbol?: string; // REST-style
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

@Injectable({ providedIn: 'root' })
export class CandleService {
  private baseUrl = 'http://localhost:8000';
  private ws?: WebSocket;
  private subject = new Subject<Candle>();

  constructor(private http: HttpClient) {}

  // ✅ REST: carica storico e normalizza i campi
    getCandles(symbol: string, interval: string = '1m', limit: number = 50): Observable<Candle[]> {
  const url = `${this.baseUrl}/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  console.log('🔍 URL chiamata:', url);
  
  return this.http.get<any[]>(url).pipe(
    map((data: any[]) => {
      console.log('🔍 Dati ricevuti dal backend:', data);
      
      if (!data) {
        console.error('🔍 Data è null/undefined');
        throw new Error('Nessun dato ricevuto dal backend');
      }
      
      if (data.length === 0) {
        console.warn('🔍 Array vuoto ricevuto');
        throw new Error('Array vuoto ricevuto dal backend');
      }
      
      const processed = data.map(c => {
        const candle: Candle = {
          t: c.t || c.timestamp || Math.floor(Date.now() / 1000),
          s: c.s || c.symbol,
          symbol: c.symbol || c.s,
          o: c.o || c.open || 0,
          h: c.h || c.high || 0,
          l: c.l || c.low || 0,
          c: c.c || c.close || 0,
          v: c.v || c.volume || 0
        };
        console.log('🔍 Candela processata:', candle);
        return candle;
      });
      
      console.log('🔍 Candele processate:', processed);
      return processed;
    })
  );
}

  // ✅ WS: streaming in tempo reale
  connect(symbol: string): Observable<Candle> {
    this.ws = new WebSocket(`ws://localhost:8000/ws/candles1s?symbol=${symbol.toLowerCase()}`);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // normalizza
        const candle: Candle = {
          t: data.t || data.timestamp || Math.floor(Date.now() / 1000),
          s: data.s,
          symbol: data.symbol || data.s,  // 👈 normalizza symbol
          o: data.o || data.open,
          h: data.h || data.high,
          l: data.l || data.low,
          c: data.c || data.close,
          v: data.v || data.volume
        };

        this.subject.next(candle);
      } catch (error) {
        console.error('Errore parsing candela:', error, event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return this.subject.asObservable();
  }

  testConnection(): Observable<any> {
    return this.http.get(`${this.baseUrl}/test/connection`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.subject.complete();
    this.subject = new Subject<Candle>(); // reset subject per nuove connessioni
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  x?: boolean;
};

@Injectable({ providedIn: 'root' })
export class CandleService {
  private baseUrl = 'http://localhost:8000';
  private ws: WebSocket | null = null;
  private subject = new Subject<Candle>();
  private currentSymbol: string | null = null;

  constructor(private http: HttpClient) {}

  // 📊 Dati storici via REST
  getHistoricalData(symbol: string, limit: number = 50): Observable<any[]> {
    console.log(`📊 Richiedo dati storici per ${symbol}`);
    return this.http
      .get<any[]>(`${this.baseUrl}/candles?symbol=${symbol}&limit=${limit}`)
      .pipe(
        catchError(error => {
          console.error('❌ Errore caricamento dati storici:', error);
          return of(this.generateSampleData(symbol, limit));
        })
      );
  }

  // 🔗 WebSocket persistente
  createWebSocket(symbol: string): Subject<Candle> {
    // Se già connesso allo stesso simbolo → riuso
    if (
      this.ws &&
      this.currentSymbol === symbol.toUpperCase() &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      console.log(`♻️ Riuso connessione candele per ${symbol}`);
      return this.subject;
    }

    // Se connessione aperta per altro simbolo → chiudo
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentSymbol = symbol.toUpperCase();
    const wsUrl = `ws://localhost:8000/ws/candles1s?symbol=${this.currentSymbol.toLowerCase()}`;
    console.log(`🔗 Connessione candele a: ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`✅ WebSocket candele connesso per ${this.currentSymbol}`);
    };

    this.ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        const candle = this.parseCandle(data);
        this.subject.next(candle);
      } catch (error) {
        console.error('❌ Errore parsing candela:', error, event.data);
      }
    };

    this.ws.onerror = error => {
      console.error('❌ Errore WebSocket candele:', error);
      this.subject.error(error);
    };

    this.ws.onclose = () => {
      console.warn(`🔌 WebSocket candele chiuso per ${this.currentSymbol}`);
      // opzionale: ricreare subject se vuoi gestire reconnect
      this.subject = new Subject<Candle>();
    };

    return this.subject;
  }

  private parseCandle(data: any): Candle {
    return {
      t: data.t,
      o: parseFloat(data.o),
      h: parseFloat(data.h),
      l: parseFloat(data.l),
      c: parseFloat(data.c),
      v: parseFloat(data.v),
      x: data.x
    };
  }

  private generateSampleData(symbol: string, limit: number): any[] {
    console.log(`🔄 Generazione dati di esempio per ${symbol}`);
    const now = Date.now();
    const data: any[] = [];

    for (let i = limit; i > 0; i--) {
      const basePrice = 50000 + Math.random() * 5000;
      const volatility = Math.random() * 200;

      data.push({
        t: now - i * 60000,
        o: basePrice,
        h: basePrice + volatility,
        l: basePrice - volatility,
        c: basePrice + (Math.random() - 0.5) * 100,
        v: 100 + Math.random() * 50
      });
    }

    return data;
  }

  // ✋ chiusura manuale (es. logout)
  disconnect() {
    if (this.ws) {
      console.log('🔌 Disconnessione manuale WebSocket candele');
      this.ws.close();
      this.ws = null;
      this.currentSymbol = null;
    }
  }
}

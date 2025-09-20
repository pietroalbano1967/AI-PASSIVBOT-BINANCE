import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, timer } from 'rxjs';
import { retryWhen, delayWhen } from 'rxjs/operators';

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number; // ✅ volume aggiunto
  x?: boolean; // ✅ opzionale, candela chiusa o aperta
};

@Injectable({ providedIn: 'root' })
export class CandleService {
  private baseUrl = 'http://localhost:8000';
  private ws: WebSocket | null = null;
  private subject: Subject<Candle> | null = null;
  private reconnectAttempts = 0;
  private reconnecting = false;
  private symbol = '';

  constructor(private http: HttpClient) {}

  connect(symbol: string): Observable<Candle> {
    this.symbol = symbol;
    this.disconnect();
    this.subject = new Subject<Candle>();
    this.openWebSocket();
    return this.subject.asObservable().pipe(
      // opzionale: puoi mettere un retryWhen qui se vuoi riconnettere lato observable
      retryWhen(errors => 
        errors.pipe(delayWhen(() => timer(2000)))
      )
    );
  }

  private openWebSocket() {
    const wsUrl = `ws://localhost:8000/ws/candles1s?symbol=${this.symbol.toLowerCase()}`;
    console.log('🔗 Connessione a:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connesso per candele');
      this.reconnectAttempts = 0;
      this.reconnecting = false;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          data.forEach(c => this.subject?.next(this.parseCandle(c)));
        } else {
          this.subject?.next(this.parseCandle(data));
        }
      } catch (error) {
        console.error('❌ Errore parsing candela:', error, event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.tryReconnect();
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket chiuso');
      this.tryReconnect();
    };
  }

  private tryReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(5000, this.reconnectAttempts * 1000);
    console.log(`🔄 Tentativo di riconnessione tra ${delay}ms...`);
    setTimeout(() => this.openWebSocket(), delay);
  }

  private parseCandle(data: any): Candle {
    return {
      t: data.t || Date.now(),
      o: parseFloat(data.o) || 0,
      h: parseFloat(data.h) || 0,
      l: parseFloat(data.l) || 0,
      c: parseFloat(data.c) || 0,
      v: parseFloat(data.v) || 0,
      x: data.x ?? false  // ✅ aggiunto per sapere se la candela è chiusa
    };
  }
  

  testConnection(): Observable<any> {
    return this.http.get(`${this.baseUrl}/test-cors`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

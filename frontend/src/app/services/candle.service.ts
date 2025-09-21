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

  constructor(private http: HttpClient) {}

  // Ottieni dati storici via REST
  getHistoricalData(symbol: string, limit: number = 50): Observable<any[]> {
    console.log(`📊 Richiedo dati storici per ${symbol}`);
    return this.http.get<any[]>(`${this.baseUrl}/candles?symbol=${symbol}&limit=${limit}`).pipe(
      catchError(error => {
        console.error('❌ Errore caricamento dati storici:', error);
        return of(this.generateSampleData(symbol, limit));
      })
    );
  }

  // Crea WebSocket per dati real-time
  createWebSocket(symbol: string): Subject<Candle> {
    const subject = new Subject<Candle>();
    const wsUrl = `ws://localhost:8000/ws/candles1s?symbol=${symbol.toLowerCase()}`;
    
    console.log(`🔗 Creando WebSocket: ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connesso per candele');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const candle = this.parseCandle(data);
          subject.next(candle);
        } catch (error) {
          console.error('❌ Errore parsing candela:', error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        subject.error(error);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket chiuso');
        subject.complete();
      };

    } catch (error) {
      console.error('❌ Errore creazione WebSocket:', error);
      subject.error(error);
    }
    
    return subject;
  }

  private parseCandle(data: any): Candle {
    // I dati dal WebSocket hanno questa struttura:
    // {"t":1758489139000,"s":"BTCUSDT","o":115279.31,"h":115279.31,"l":115279.31,"c":115279.31,"v":0.00095,"x":true}
    return {
      t: data.t, // già in millisecondi
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
        t: (now - (i * 60000)) * 1000, // converto in ms come il WebSocket
        o: basePrice,
        h: basePrice + volatility,
        l: basePrice - volatility,
        c: basePrice + (Math.random() - 0.5) * 100,
        v: 100 + Math.random() * 50
      });
    }
    
    return data;
  }
}
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

export interface SignalData {
  symbol: string;
  close: number;
  ma5: number;
  ma20: number;
  rsi: number;              // ✅ RSI
  signal: string;
  confidence: number;
  probs: Record<string, number>;
  action: string | null;
  t: number;
  macd?: {
    macd: number;
    signal: number;
    hist: number;
  };                        // ✅ MACD opzionale
}

@Injectable({ providedIn: 'root' })
export class SignalsService {
  private ws: WebSocket | null = null;
  private subject?: ReplaySubject<SignalData>;

  connect(symbol: string = 'BTCUSDT'): Observable<SignalData> {
    this.disconnect(); // chiude eventuale connessione aperta
    this.subject = new ReplaySubject<SignalData>(1);

    const url = `ws://localhost:8000/ws/signals?symbol=${symbol.toLowerCase()}`;
    console.log(`🔗 Connessione a signals: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => console.log(`✅ WS aperto per signals ${symbol}`);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SignalData;
        console.log("📡 Dati signal:", data);
        this.subject?.next(data);
      } catch (err) {
        console.error("❌ Errore parsing signals:", err, event.data);
      }
    };
    this.ws.onerror = (err) => console.error("❌ Errore WS:", err);
    this.ws.onclose = () => console.log("🔌 WS signals chiuso");

    return this.subject.asObservable();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subject = undefined;
  }
}

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
  private simulationEnabled = true;

  connect(symbol: string = 'BTCUSDT'): Observable<SignalData> {
  this.disconnect();
  this.subject = new ReplaySubject<SignalData>(50);

  const url = `ws://localhost:8000/ws/signals?symbol=${symbol.toLowerCase()}`;
  console.log(`🔗 Connessione a signals: ${url}`);

  this.ws = new WebSocket(url);

  this.ws.onopen = () => {
    console.log(`✅ WS aperto per signals ${symbol}`);
    // Invia un messaggio di test
    this.subject?.next({
      symbol: symbol,
      close: 0,
      ma5: 0,
      ma20: 0,
      rsi: 50, // Valore di test
      signal: 'HOLD',
      confidence: 0.5,
      probs: {},
      action: null,
      t: Math.floor(Date.now() / 1000)
    } as SignalData);
  };

  this.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as SignalData;
      console.log("📡 Dati signal ricevuti:", data);
      
      if (!this.simulationEnabled) {
        data.action = null;
      }
      
      this.subject?.next(data);
    } catch (err) {
      console.error("❌ Errore parsing signals:", err, event.data);
    }
  };

  this.ws.onerror = (err) => {
    console.error("❌ Errore WS:", err);
    this.subject?.error(err);
  };

  this.ws.onclose = () => {
    console.log("🔌 WS signals chiuso");
    this.subject?.complete();
  };

  return this.subject.asObservable();
}

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subject = undefined;
  }
  setSimulationEnabled(enabled: boolean) {
    this.simulationEnabled = enabled;
    console.log(`🎛 Simulazione ${enabled ? 'abilitata' : 'disabilitata'}`);
  }

  isSimulationEnabled(): boolean {
    return this.simulationEnabled;
  }
}

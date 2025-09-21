import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, timer } from 'rxjs';
import { retryWhen, delayWhen } from 'rxjs/operators';

export interface SignalData {
  symbol: string;
  close: number;
  ma5: number;
  ma20: number;
  rsi: number;
  signal: string;
  confidence: number;
  probs: Record<string, number>;
  action: string | null;
  t: number;
  macd?: {
    macd: number;
    signal: number;
    hist: number;
  };
}

@Injectable({ providedIn: 'root' })
export class SignalsService {
  private ws: WebSocket | null = null;
  private subject?: ReplaySubject<SignalData>;
  private simulationEnabled = true;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(symbol: string = 'BTCUSDT'): Observable<SignalData> {
    this.disconnect();
    this.subject = new ReplaySubject<SignalData>(50);

    this.establishConnection(symbol);
    
    return this.subject.asObservable().pipe(
      retryWhen(errors => 
        errors.pipe(
          delayWhen(() => {
            this.reconnectAttempts++;
            const delay = Math.min(3000 * this.reconnectAttempts, 10000);
            console.log(`🔄 Ritento connessione in ${delay}ms...`);
            return timer(delay);
          })
        )
      )
    );
  }

  private establishConnection(symbol: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Troppi tentativi di riconnessione falliti');
      this.subject?.error('Max reconnection attempts reached');
      return;
    }

    const url = `ws://localhost:8000/ws/signals?symbol=${symbol.toLowerCase()}`;
    console.log(`🔗 Tentativo connessione ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} a: ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`✅ WebSocket CONNESSO per signals ${symbol}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Invia segnale di connessione riuscita
        this.subject?.next({
          symbol: symbol,
          close: 0,
          ma5: 0,
          ma20: 0,
          rsi: 50,
          signal: 'CONNESSIONE STABILITA',
          confidence: 1,
          probs: { 'CONNECTED': 1 },
          action: null,
          t: Math.floor(Date.now() / 1000),
          macd: { macd: 0, signal: 0, hist: 0 }
        } as SignalData);
      };

      this.ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const data = this.normalizeSignalData(rawData);
          
          if (!this.simulationEnabled) {
            data.action = null;
          }
          
          this.subject?.next(data);
        } catch (err) {
          console.error("❌ Errore parsing signals:", err, event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.error("❌ Errore WebSocket:", err);
        this.isConnected = false;
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket chiuso: ${event.code} ${event.reason}`);
        this.isConnected = false;
        
        if (event.code !== 1000) { // Non chiudere se è una chiusura normale
          setTimeout(() => this.establishConnection(symbol), 2000);
        }
      };

    } catch (error) {
      console.error('❌ Errore creazione WebSocket:', error);
      setTimeout(() => this.establishConnection(symbol), 2000);
    }
  }

  private normalizeSignalData(rawData: any): SignalData {
    let macdData = { macd: 0, signal: 0, hist: 0 };

    if (rawData.macd && typeof rawData.macd === 'object') {
      macdData = {
        macd: rawData.macd.macd || 0,
        signal: rawData.macd.signal || 0,
        hist: rawData.macd.hist || 0
      };
    }

    return {
      symbol: rawData.symbol || 'UNKNOWN',
      close: rawData.close || 0,
      ma5: rawData.ma5 || 0,
      ma20: rawData.ma20 || 0,
      rsi: rawData.rsi || 50,
      signal: rawData.signal || 'HOLD',
      confidence: rawData.confidence || 0.5,
      probs: rawData.probs || {},
      action: rawData.action || null,
      t: rawData.t || Math.floor(Date.now() / 1000),
      macd: macdData
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.isConnected = false;
    this.subject?.complete();
    this.subject = undefined;
  }

  setSimulationEnabled(enabled: boolean) {
    this.simulationEnabled = enabled;
    console.log(`🎛 Simulazione ${enabled ? 'abilitata' : 'disabilitata'}`);
  }

  isSimulationEnabled(): boolean {
    return this.simulationEnabled;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
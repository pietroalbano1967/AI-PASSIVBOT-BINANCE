import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface AiSignal {
  symbol: string;
  close: number;
  rsi: number;
  signal: string;
  confidence: number;
  t: number;
}

@Injectable({ providedIn: 'root' })
export class SignalsService {
  private ws?: WebSocket;
  private subject = new Subject<AiSignal>();

  connect(symbol: string = 'BTCUSDT'): Observable<AiSignal> {
    this.ws = new WebSocket(`ws://localhost:8000/ws/signals?symbol=${symbol}`);
    this.ws.onmessage = (event) => {
      this.subject.next(JSON.parse(event.data) as AiSignal);
    };
    return this.subject.asObservable();
  }

  disconnect() {
    this.ws?.close();
  }
}

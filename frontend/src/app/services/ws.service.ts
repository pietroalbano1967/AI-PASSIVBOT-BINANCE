// ws.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WsService {
  private ws: WebSocket | null = null;
  private subject: Subject<any> | null = null;

  connect(url: string): Observable<any> {
    // Disconnetti prima se c'è una connessione esistente
    this.disconnect();

    this.ws = new WebSocket(url);
    this.subject = new Subject<any>();

    this.ws.onopen = () => {
      console.log('✅ WebSocket connesso a:', url);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Dati WS ricevuti:', data);
        this.subject?.next(data);
      } catch (error) {
        console.error('❌ Errore parsing WS:', error, event.data);
        this.subject?.next(event.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.subject?.error(error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket chiuso');
      this.subject?.complete();
    };

    return this.subject.asObservable();
  }

  connectCandles(symbol: string, interval: string): Observable<any> {
    const url = `ws://localhost:8000/ws/candles${interval}?symbol=${symbol.toLowerCase()}`;
    console.log('🔗 Connessione a:', url);
    return this.connect(url);
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 Disconnessione WebSocket');
      this.ws.close();
      this.ws = null;
    }
    if (this.subject) {
      this.subject.complete();
      this.subject = null;
    }
  }
}
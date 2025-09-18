import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WsService {
  private ws?: WebSocket;
  private subject?: Subject<any>;

  connect(url: string): Observable<any> {
    if (this.ws) {
      this.disconnect();
    }

    this.ws = new WebSocket(url);
    this.subject = new Subject<any>();

    this.ws.onmessage = (event) => {
      try {
        this.subject?.next(JSON.parse(event.data));
      } catch {
        this.subject?.next(event.data);
      }
    };

    this.ws.onerror = (error) => console.error("WebSocket error:", error);
    this.ws.onclose = () => this.subject?.complete();

    return this.subject.asObservable();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
}

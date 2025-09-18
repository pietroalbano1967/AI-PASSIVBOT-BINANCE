import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  id: number;
  t: number;
  symbol: string;
  price: number;
  signal: string;
  confidence: number;
  side: 'BUY' | 'SELL';
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  getOrders(): Observable<{ orders: Order[] }> {
    return this.http.get<{ orders: Order[] }>(`${this.baseUrl}/simulated_orders`);
  }
}

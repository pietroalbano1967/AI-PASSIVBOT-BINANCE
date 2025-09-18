import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SignalResponse {
  symbol: string;
  close: number;
  signal: string;
  confidence: number;
  probs: { [key: string]: number };
  t: number;
}

export interface TickerResponse {
  symbol: string;
  price: number;
  volume: number;
  high: number;
  low: number;
}
export interface TickerResponse {
  symbol: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;   // ✅ aggiunto
}

export interface CandleResponse {
  t: number;
  symbol: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  // ✅ stato API
  getStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/status`);
  }

  // ✅ backtest/optimize/results
  runBacktest(config: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/backtest`, { config });
  }

  runOptimize(config: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/optimize`, { config });
  }

  listResults(): Observable<{ results: string[] }> {
    return this.http.get<{ results: string[] }>(`${this.baseUrl}/results`);
  }

  // ✅ AI prediction singola
  getPrediction(symbol: string, close: number, high: number, low: number, volume: number): Observable<SignalResponse> {
    let params = new HttpParams()
      .set('symbol', symbol)
      .set('close', close)
      .set('high', high)
      .set('low', low)
      .set('volume', volume);

    return this.http.get<SignalResponse>(`${this.baseUrl}/predict`, { params });
  }

  // ✅ snapshot ticker
  getTicker(symbol: string): Observable<TickerResponse> {
    let params = new HttpParams().set('symbol', symbol);
    return this.http.get<TickerResponse>(`${this.baseUrl}/tickers`, { params });
  }

  // ✅ snapshot candles
  getCandles(symbol: string, interval: string = '1m', limit: number = 100): Observable<CandleResponse[]> {
    let params = new HttpParams()
      .set('symbol', symbol)
      .set('interval', interval)
      .set('limit', limit);

    return this.http.get<CandleResponse[]>(`${this.baseUrl}/candles`, { params });
  }

  getSavedCandles(symbol: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/saved_candles/${symbol}`);
  }

  // ✅ reload modello AI
  reloadModel(): Observable<any> {
    return this.http.post(`${this.baseUrl}/reload_model`, {});
  }
}

// mini-ticker.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TickerService, Ticker } from '../../services/ticker.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mini-ticker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-ticker.component.html',
  styleUrls: ['./mini-ticker.component.scss']
})
export class MiniTickerComponent implements OnInit, OnDestroy {
  tickers: Ticker[] = [];
  private subscription?: Subscription;

  @Output() symbolSelected = new EventEmitter<string>();

  constructor(private tickerService: TickerService) {}

  ngOnInit() {
    console.log('💹 MiniTickerComponent - INIT');
    this.connectToTickers();
  }

  ngOnDestroy() {
    console.log('💹 MiniTickerComponent - DESTROY');
    this.disconnect();
  }

  private connectToTickers() {
    this.subscription = this.tickerService.connect().subscribe({
      next: (t: Ticker) => {
        this.updateTicker(t);
      },
      error: (err) => {
        console.error('❌ Errore tickers:', err);
      }
    });
  }

  private updateTicker(t: Ticker) {
    const idx = this.tickers.findIndex(x => x.s === t.s);
    if (idx >= 0) {
      this.tickers[idx] = t;
    } else {
      this.tickers.unshift(t);
      // Massimo 15 tickers
      if (this.tickers.length > 15) {
        this.tickers.pop();
      }
    }
  }

  private disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getChangePercent(t: Ticker): number {
    const close = Number(t.c);
    const open = Number(t.o || t.c);
    return open && !isNaN(open) ? ((close - open) / open) * 100 : 0;
  }

  getChangeClass(t: Ticker): string {
    return this.getChangePercent(t) >= 0 ? 'positive' : 'negative';
  }

  selectSymbol(symbol: string) {
    console.log("🔘 Simbolo selezionato:", symbol);
    this.symbolSelected.emit(symbol.toUpperCase());
  }
}
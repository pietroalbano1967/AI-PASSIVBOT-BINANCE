import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TickerService, Ticker } from '../../services/ticker.service';

@Component({
  selector: 'app-mini-ticker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-ticker.component.html',
  styleUrls: ['./mini-ticker.component.scss']
})
export class MiniTickerComponent implements OnInit, OnDestroy {
  tickers: Ticker[] = [];
  private subscription: any;

  @Output() symbolSelected = new EventEmitter<string>();  // 👈 nuovo

  constructor(private tickerService: TickerService) {}

  ngOnInit() {
    this.subscription = this.tickerService.connect().subscribe((t: Ticker) => {
      const idx = this.tickers.findIndex(x => x.s === t.s);
      if (idx >= 0) {
        this.tickers[idx] = t;
      } else {
        this.tickers.push(t);
      }
    });
  }

  ngOnDestroy() {
    this.tickerService.disconnect();
    if (this.subscription) this.subscription.unsubscribe();
  }

  getChangePercent(t: Ticker): number {
    const close = Number(t.c);
    const open = Number(t.o || t.c);
    if (!open || isNaN(open)) return 0;
    return ((close - open) / open) * 100;
  }

  getChangeClass(t: Ticker): string {
    return this.getChangePercent(t) >= 0 ? 'positive' : 'negative';
  }

  // 👇 quando clicchi su una card
  selectSymbol(symbol: string) {
  console.log("🔘 Simbolo selezionato:", symbol);
  this.symbolSelected.emit(symbol.toUpperCase());
}
}

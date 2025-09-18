import { Component, OnInit, OnDestroy } from '@angular/core';
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

  constructor(private tickerService: TickerService) {}

  ngOnInit() {
    this.subscription = this.tickerService.connect().subscribe((t: Ticker) => {
      // Aggiorna o aggiunge ticker senza cambiare l'ordine
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
    try {
      const close = Number(t.c);
      const open = Number(t.o || t.c);
      if (!open || isNaN(open)) return 0;
      return ((close - open) / open) * 100;
    } catch {
      return 0;
    }
  }

  getChangeClass(t: Ticker): string {
    return this.getChangePercent(t) >= 0 ? 'positive' : 'negative';
  }
}

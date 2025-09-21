import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalsService, SignalData } from '../../services/signals.service';

@Component({
  selector: 'app-ai-signals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-signals.component.html',
  styleUrls: ['./ai-signals.component.scss']
})
export class AiSignalsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() symbol: string = 'BTCUSDT';
  signals: SignalData[] = [];

  private subscription?: Subscription;

  constructor(private signalsService: SignalsService) {}

  ngOnInit() {
    this.connectWS();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['symbol'] && !changes['symbol'].firstChange) {
      console.log("🔄 Cambio simbolo AI-Signals:", this.symbol);
      this.disconnect();
      this.signals = [];
      this.connectWS();
    }
  }

  private connectWS() {
    this.subscription = this.signalsService.connect(this.symbol).subscribe((data: SignalData) => {
      this.signals.unshift(data);
      this.signals = this.signals.slice(0, 50); // massimo 50 segnali
    });
  }

  private disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
    this.signalsService.disconnect();
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

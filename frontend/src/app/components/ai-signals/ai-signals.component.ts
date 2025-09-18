import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalsService, AiSignal } from '../../services/signals.service';


@Component({
  selector: 'app-ai-signals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-signals.component.html',
  styleUrls: ['./ai-signals.component.scss']
})
export class AiSignalsComponent implements OnInit, OnDestroy {
  signals: any[] = [];

  constructor(private signalsService: SignalsService) {}

  ngOnInit() {
   this.signalsService.connect().subscribe((sig: AiSignal) => {
  this.signals = [sig, ...this.signals].slice(0, 20);
});
  }

  ngOnDestroy() {
    this.signalsService.disconnect();
  }
}

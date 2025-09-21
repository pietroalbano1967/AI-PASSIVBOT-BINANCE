import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalData } from '../../services/signals.service';

@Component({
  selector: 'app-ai-signals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-signals.component.html',
  styleUrls: ['./ai-signals.component.scss']
})
export class AiSignalsComponent {
  @Input() signals: SignalData[] = [];
  @Input() simulationEnabled: boolean = true;
  @Output() simulationToggled = new EventEmitter<boolean>();

  toggleSimulation() {
    this.simulationEnabled = !this.simulationEnabled;
    this.simulationToggled.emit(this.simulationEnabled);
  }

  trackBySignal(index: number, signal: SignalData): string {
    return `${signal.symbol}-${signal.t}-${signal.signal}`;
  }
}


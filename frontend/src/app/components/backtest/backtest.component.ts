import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backtest.component.html',
  styleUrls: ['./backtest.component.scss']
})
export class BacktestComponent {
  configName = '';
  output = '';

  constructor(private api: ApiService) {}

  submit() {
    if (!this.configName.trim()) return;
    this.output = '⏳ Avvio...';
    this.api.runBacktest(this.configName).subscribe(res => {
      this.output = res.stdout || '✅ Completato';
    });
  }
}

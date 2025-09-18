import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-optimize',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './optimize.component.html',
  styleUrls: ['./optimize.component.scss']
})
export class OptimizeComponent {
  configName = '';
  output = '';

  constructor(private api: ApiService) {}

  submit() {
    if (!this.configName.trim()) return;
    this.output = '⏳ Ottimizzazione in corso...';
    this.api.runOptimize(this.configName).subscribe(res => {
      this.output = res.stdout || '✅ Completato';
    });
  }
}

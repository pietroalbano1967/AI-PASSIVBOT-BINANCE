import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit {
 results!: string[];
  constructor(private api: ApiService) {}

 ngOnInit() {
  this.results = [];
  this.load();
}

  load() {
    this.api.listResults().subscribe(res => this.results = res.results);
  }

  getDownloadUrl(file: string): string {
    return `http://127.0.0.1:8000/results/${file}`;
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService, Order } from '../../services/orders.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  paginatedOrders: Order[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  private interval?: any;

  constructor(private ordersService: OrdersService) {}

  ngOnInit() {
    this.loadOrders();
    this.interval = setInterval(() => this.loadOrders(), 5000);
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  loadOrders() {
    this.ordersService.getOrders().subscribe({
      next: (res: { orders: Order[] }) => {
        this.orders = res.orders.sort((a, b) => b.t - a.t);
        this.updatePaginatedOrders();
      },
      error: (err: any) => console.error('❌ Errore caricamento ordini:', err)
    });
  }

  updatePaginatedOrders() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = this.orders.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedOrders();
  }

  get totalPages(): number {
    return Math.ceil(this.orders.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  trackByOrder(index: number, item: Order): number {
    return item.id;
  }

  // 👇 aggiunto per compatibilità con HTML
  saveOrders() {
    console.log("💾 saveOrders() chiamato (stub) - da implementare se serve davvero");
  }
}

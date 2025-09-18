import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdersService, Order } from '../../services/orders.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  paginatedOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 15;

  constructor(private ordersService: OrdersService) {}

  ngOnInit() {
    this.loadOrders();
    setInterval(() => this.loadOrders(), 5000);
  }

  loadOrders() {
    this.ordersService.getOrders().subscribe((res) => {
      this.orders = res.orders.sort((a, b) => b.t - a.t);
      this.updatePaginatedOrders();
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
}
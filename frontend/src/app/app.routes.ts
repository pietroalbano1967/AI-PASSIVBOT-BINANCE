import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BacktestComponent } from './components/backtest/backtest.component';
import { OptimizeComponent } from './components/optimize/optimize.component';
import { ResultsComponent } from './components/results/results.component';
import { OrdersComponent } from './components/orders/orders.component';
import { TickerDetailComponent } from './components/ticker-detail/ticker-detail.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },   // default
  { path: 'dashboard', component: DashboardComponent },
  { path: 'backtest', component: BacktestComponent },
  { path: 'optimize', component: OptimizeComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'ticker/:symbol', component: TickerDetailComponent },  
];
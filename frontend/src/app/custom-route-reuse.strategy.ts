import { RouteReuseStrategy, DetachedRouteHandle, ActivatedRouteSnapshot } from '@angular/router';

export class CustomRouteReuseStrategy implements RouteReuseStrategy {
  private handlers: { [key: string]: DetachedRouteHandle } = {};

  private shouldCache(path: string | undefined): boolean {
    if (!path) return false;
    // 👇 mantieni in cache dashboard e ticker/:id
    return path === 'dashboard' || path.startsWith('ticker');
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.shouldCache(route.routeConfig?.path);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    if (route.routeConfig?.path) {
      this.handlers[route.routeConfig.path] = handle;
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.shouldCache(route.routeConfig?.path) && !!this.handlers[route.routeConfig?.path || ''];
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (!route.routeConfig?.path) return null;
    return this.handlers[route.routeConfig.path] || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}

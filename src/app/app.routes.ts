import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'p/:id',
    loadComponent: () => import('./pages/public-product').then((m) => m.PublicProduct),
  },
  {
    path: '',
    loadComponent: () => import('./ui/shell').then((m) => m.Shell),
    children: [
      { path: '', loadComponent: () => import('./pages/catalog').then((m) => m.Catalog) },
      { path: 'sale', loadComponent: () => import('./pages/sale').then((m) => m.SalePage) },
      { path: 'debts', loadComponent: () => import('./pages/debts').then((m) => m.Debts) },
      { path: 'history', loadComponent: () => import('./pages/history').then((m) => m.History) },
      { path: 'labels', loadComponent: () => import('./pages/labels').then((m) => m.Labels) },
      { path: 'settings', loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];

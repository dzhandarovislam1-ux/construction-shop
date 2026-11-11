import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Cart, Store } from '../core/store';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top no-print">
      <a class="brand" routerLink="/">
        <span class="logo">🛠</span>{{ store.settings().storeName }}
      </a>
      <nav>
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
          <i>📦</i><span>Товары</span>
          @if (store.lowStock().length) {
            <b class="dot warn" title="Заканчиваются">{{ store.lowStock().length }}</b>
          }
        </a>
        <a routerLink="/sale" routerLinkActive="on">
          <i>🧾</i><span>Касса</span>
          @if (cart.lines().length) {
            <b class="dot">{{ cart.lines().length }}</b>
          }
        </a>
        <a routerLink="/debts" routerLinkActive="on"><i>📒</i><span>Долги</span></a>
        <a routerLink="/history" routerLinkActive="on"><i>📊</i><span>Продажи</span></a>
        <a routerLink="/labels" routerLinkActive="on"><i>🏷</i><span>Ценники</span></a>
        <a routerLink="/settings" routerLinkActive="on"><i>⚙</i><span>Настройки</span></a>
      </nav>
    </header>
    @if (store.saveError()) {
      <p class="alert save-error no-print">
        Данные не сохраняются: хранилище браузера переполнено или недоступно. Сделайте резервную
        копию в «Настройках».
      </p>
    }
    <main><router-outlet /></main>
  `,
  styles: `
    .top {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; gap: 24px;
      padding: 10px 20px;
      background: rgba(20, 23, 28, 0.85); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
    }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; color: var(--text); text-decoration: none; white-space: nowrap; }
    .logo { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--accent); font-size: 18px; }
    nav { display: flex; gap: 4px; flex: 1; }
    nav a {
      position: relative; display: flex; align-items: center; gap: 8px;
      padding: 9px 14px; border-radius: 10px;
      color: var(--muted); text-decoration: none; font-weight: 600; white-space: nowrap;
    }
    nav a:hover { color: var(--text); background: var(--glass); }
    nav a.on { color: #14171c; background: var(--accent); }
    nav i { font-style: normal; }
    .dot { min-width: 20px; padding: 1px 6px; border-radius: 10px; background: var(--accent); color: #14171c; font-size: 12px; text-align: center; }
    .dot.warn { background: var(--danger); color: #fff; }
    nav a.on .dot { background: #14171c; color: var(--accent); }
    main { max-width: 1200px; margin: 0 auto; padding: 24px 20px 60px; }
    .save-error { max-width: 1160px; margin: 16px auto 0; }

    @media (max-width: 860px) {
      /* Без backdrop-filter: иначе нижнее меню прилипает к шапке, а не к экрану. */
      .top { padding: 10px 16px; background: #14171c; backdrop-filter: none; }
      nav {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
        justify-content: space-around; gap: 0; padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
        background: rgba(20, 23, 28, 0.95); backdrop-filter: blur(12px);
        border-top: 1px solid var(--line);
      }
      nav a { flex-direction: column; gap: 2px; padding: 6px 8px; font-size: 11px; }
      nav i { font-size: 20px; }
      .dot { position: absolute; top: 0; right: 0; }
      main { padding: 16px 16px 100px; }
    }
  `,
})
export class Shell {
  protected readonly store = inject(Store);
  protected readonly cart = inject(Cart);
}

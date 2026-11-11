import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORIES, Product, categoryOf } from '../core/models';
import { MoneyPipe, QtyPipe } from '../core/pipes';
import { Cart, Store } from '../core/store';
import { ProductForm } from '../ui/product-form';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, MoneyPipe, QtyPipe, ProductForm],
  template: `
    <div class="page-head">
      <h1>Товары</h1>
      <button class="btn primary" (click)="editing.set(null)">+ Новый товар</button>
    </div>

    <input
      class="input"
      type="search"
      placeholder="Поиск: название, артикул или штрихкод"
      [ngModel]="q()"
      (ngModelChange)="q.set($event)"
    />

    <div class="chips">
      <button class="chip" [class.on]="filter() === 'all'" (click)="filter.set('all')">
        Все · {{ store.products().length }}
      </button>
      <button class="chip" [class.on]="filter() === 'low'" (click)="filter.set('low')">
        ⚠ Заканчиваются · {{ store.lowStock().length }}
      </button>
      @for (c of categories; track c.id) {
        <button class="chip" [class.on]="filter() === c.id" (click)="filter.set(c.id)">
          {{ c.icon }} {{ c.name }}
        </button>
      }
    </div>

    <div class="grid">
      @for (p of filtered(); track p.id) {
        <article class="card product">
          <div class="row top">
            <span class="icon">{{ icon(p) }}</span>
            @if (p.stock <= 0) {
              <span class="badge out">Нет в наличии</span>
            } @else {
              <span class="badge" [class.low]="p.stock <= p.minStock" [class.ok]="p.stock > p.minStock">
                {{ p.stock | qty }} {{ p.unit }}
              </span>
            }
          </div>
          <h3>{{ p.name }}</h3>
          <p class="muted sku">{{ p.sku || p.barcode || '—' }}</p>
          <p class="price">{{ p.sellPrice | money }} <small>/ {{ p.unit }}</small></p>
          <div class="actions">
            <button class="btn primary small grow" (click)="cart.add(p)">
              В чек{{ inCart(p.id) ? ' · ' + (inCart(p.id) | qty) : '' }}
            </button>
            <button class="btn small" (click)="openReceive(p)">Приход</button>
            <button class="btn small" title="Изменить" (click)="editing.set(p)">✎</button>
          </div>
        </article>
      } @empty {
        <p class="empty wide">Ничего не найдено</p>
      }
    </div>

    @if (editing() !== undefined) {
      <app-product-form [product]="editing() ?? null" (closed)="editing.set(undefined)" />
    }

    @if (receiving(); as p) {
      <div class="backdrop">
        <form class="modal" style="max-width: 420px" (ngSubmit)="receive(p)">
          <h2>Приход товара</h2>
          <p class="muted">{{ p.name }} · сейчас {{ p.stock | qty }} {{ p.unit }}</p>
          <label class="field">
            Сколько пришло, {{ p.unit }}
            <input class="input" type="number" name="qty" [(ngModel)]="rQty" min="0" step="any" />
          </label>
          <label class="field">
            Цена закупки за {{ p.unit }}
            <input class="input" type="number" name="price" [(ngModel)]="rPrice" min="0" step="any" />
          </label>
          @if (error()) {
            <p class="alert">{{ error() }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn" (click)="receiving.set(null)">Отмена</button>
            <button type="submit" class="btn primary">Принять на склад</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
    .wide { grid-column: 1 / -1; }
    .product { display: flex; flex-direction: column; gap: 6px; transition: border-color 0.15s, transform 0.15s; }
    .product:hover { border-color: rgba(255, 194, 26, 0.5); transform: translateY(-2px); }
    .top { justify-content: space-between; margin-bottom: 4px; }
    .icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 194, 26, 0.12); border: 1px solid rgba(255, 194, 26, 0.3); font-size: 24px; }
    .sku { font-size: 12px; }
    .price { margin-top: auto; padding-top: 6px; font-size: 22px; font-weight: 800; color: var(--accent); }
    .price small { font-size: 13px; font-weight: 500; color: var(--muted); }
    .actions { display: flex; gap: 6px; margin-top: 8px; }
    @media (max-width: 520px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .card { padding: 12px; } .price { font-size: 18px; } .actions { flex-wrap: wrap; } .actions .grow { flex-basis: 100%; } .actions .btn:not(.grow) { flex: 1; } }
  `,
})
export class Catalog {
  protected readonly store = inject(Store);
  protected readonly cart = inject(Cart);
  protected readonly categories = CATEGORIES;

  protected readonly q = signal('');
  /** 'all', 'low' или id категории. */
  protected readonly filter = signal('all');
  /** undefined — окно закрыто, null — новый товар. */
  protected readonly editing = signal<Product | null | undefined>(undefined);
  protected readonly receiving = signal<Product | null>(null);
  protected readonly error = signal('');
  protected rQty: number | null = null;
  protected rPrice: number | null = null;

  protected readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const f = this.filter();
    return this.store.products().filter((p) => {
      if (f === 'low' ? p.stock > p.minStock : f !== 'all' && p.category !== f) return false;
      return !q || `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q);
    });
  });

  protected icon(p: Product) {
    return categoryOf(p.category).icon;
  }

  protected inCart(id: string): number {
    return this.cart.lines().find((l) => l.productId === id)?.qty ?? 0;
  }

  protected openReceive(p: Product) {
    this.rQty = null;
    this.rPrice = p.buyPrice;
    this.error.set('');
    this.receiving.set(p);
  }

  protected receive(p: Product) {
    try {
      this.store.receive(p.id, Number(this.rQty), Number(this.rPrice) || 0);
      this.receiving.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

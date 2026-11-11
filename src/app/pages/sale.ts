import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PAYMENT_LABEL, Payment, Product, Sale } from '../core/models';
import { MoneyPipe, QtyPipe } from '../core/pipes';
import { Cart, Store } from '../core/store';
import { Scanner } from '../ui/scanner';

@Component({
  selector: 'app-sale',
  imports: [FormsModule, MoneyPipe, QtyPipe, Scanner],
  template: `
    <div class="page-head"><h1>Касса</h1></div>

    <div class="layout">
      <section class="stack">
        <div class="row" style="flex-wrap: nowrap">
          <input
            class="input"
            type="search"
            autofocus
            placeholder="Название, артикул или штрихкод"
            [ngModel]="q()"
            (ngModelChange)="q.set($event); notFound.set('')"
            (keydown.enter)="onEnter()"
          />
          <button class="btn primary" (click)="scanning.set(true)">📷 Сканировать</button>
        </div>
        @if (notFound()) {
          <p class="alert">Товар с кодом «{{ notFound() }}» не найден</p>
        }
        <div class="list">
          @for (p of results(); track p.id) {
            <button class="line pick" (click)="add(p)">
              <span class="grow">
                <b>{{ p.name }}</b><br />
                <small class="muted">
                  {{ p.sku }} · на складе {{ p.stock | qty }} {{ p.unit }}
                </small>
              </span>
              <b class="accent">{{ p.sellPrice | money }}</b>
            </button>
          } @empty {
            <p class="empty">
              {{ q() ? 'Ничего не найдено' : 'Найдите товар или отсканируйте QR-ценник / штрихкод' }}
            </p>
          }
        </div>
      </section>

      <section class="card stack receipt">
        <h2>Чек</h2>
        @if (lastSale(); as s) {
          <p class="notice">
            Продано на {{ s.total | money }} · {{ paymentLabel[s.payment] }}
          </p>
        }
        @for (l of cart.lines(); track l.productId) {
          <div class="cart-line">
            <div class="row" style="flex-wrap: nowrap">
              <b class="grow">{{ l.name }}</b>
              <button class="btn small ghost danger" title="Убрать" (click)="cart.remove(l.productId)">✕</button>
            </div>
            <div class="row" style="flex-wrap: nowrap">
              <input
                class="input num"
                type="number"
                min="0"
                step="any"
                [ngModel]="l.qty"
                (ngModelChange)="cart.patch(l.productId, { qty: $event ?? 0 })"
              />
              <span class="muted">{{ l.unit }} ×</span>
              <input
                class="input num"
                type="number"
                min="0"
                step="any"
                [ngModel]="l.price"
                (ngModelChange)="cart.patch(l.productId, { price: $event ?? 0 })"
              />
              <b class="grow right">{{ l.qty * l.price | money }}</b>
            </div>
            @if (shortage(l.productId, l.qty); as left) {
              <small class="danger">На складе только {{ left.stock | qty }} {{ l.unit }}</small>
            }
          </div>
        } @empty {
          <p class="muted">Чек пуст</p>
        }

        @if (cart.lines().length) {
          <div class="row total">
            <span class="grow">Итого</span>
            <b class="accent">{{ cart.total() | money }}</b>
          </div>

          <div class="pay">
            @for (p of payments; track p) {
              <button class="chip" [class.on]="payment() === p" (click)="payment.set(p)">
                {{ paymentLabel[p] }}
              </button>
            }
          </div>

          @if (payment() === 'debt') {
            <select class="input" [ngModel]="customerId()" (ngModelChange)="customerId.set($event)">
              <option value="">— Кто берёт в долг —</option>
              @for (c of store.customers(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
              <option value="new">+ Новый покупатель</option>
            </select>
            @if (customerId() === 'new') {
              <input class="input" placeholder="Имя" [(ngModel)]="newName" />
              <input class="input" placeholder="Телефон" type="tel" [(ngModel)]="newPhone" />
            }
          }

          @if (error()) {
            <p class="alert">{{ error() }}</p>
          }
          <button class="btn primary big" (click)="checkout()">Продать</button>
          <button class="btn ghost" (click)="cart.clear()">Очистить чек</button>
        }
      </section>
    </div>

    @if (scanning()) {
      <app-scanner (scanned)="onScan($event)" (closed)="scanning.set(false)" />
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1fr 400px; gap: 20px; align-items: start; }
    .pick { width: 100%; text-align: left; color: inherit; font: inherit; cursor: pointer; }
    .pick:hover { border-color: var(--accent); }
    .receipt { position: sticky; top: 80px; }
    .cart-line { display: grid; gap: 6px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .num { width: 86px; min-height: 36px; padding: 4px 8px; flex: none; }
    .total { font-size: 24px; font-weight: 800; }
    .pay { display: flex; gap: 8px; }
    .pay .chip { flex: 1; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .receipt { position: static; } }
  `,
})
export class SalePage {
  protected readonly store = inject(Store);
  protected readonly cart = inject(Cart);
  protected readonly paymentLabel = PAYMENT_LABEL;
  protected readonly payments: Payment[] = ['cash', 'card', 'debt'];

  protected readonly q = signal('');
  protected readonly scanning = signal(false);
  protected readonly notFound = signal('');
  protected readonly payment = signal<Payment>('cash');
  /** '' — не выбран, 'new' — завести нового. */
  protected readonly customerId = signal('');
  protected readonly error = signal('');
  protected readonly lastSale = signal<Sale | null>(null);
  protected newName = '';
  protected newPhone = '';

  protected readonly results = computed(() => {
    const q = this.q().trim().toLowerCase();
    if (!q) return [];
    return this.store
      .products()
      .filter((p) => `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q))
      .slice(0, 10);
  });

  protected add(p: Product) {
    this.cart.add(p);
    this.q.set('');
    this.notFound.set('');
    this.lastSale.set(null);
  }

  /** Enter в поиске: так же «печатает» код и USB-сканер штрихкодов. */
  protected onEnter() {
    const text = this.q().trim();
    if (!text) return;
    const exact = this.store.findByCode(text);
    const only = this.results().length === 1 ? this.results()[0] : undefined;
    const p = exact ?? only;
    if (p) this.add(p);
    else if (!this.results().length) this.notFound.set(text);
  }

  protected onScan(text: string) {
    this.scanning.set(false);
    const p = this.store.findByCode(text);
    if (p) this.add(p);
    else this.notFound.set(text);
  }

  protected shortage(productId: string, qty: number) {
    const p = this.store.product(productId);
    return p && qty > p.stock ? { stock: Math.max(p.stock, 0) } : null;
  }

  protected checkout() {
    this.error.set('');
    try {
      let customerId: string | undefined;
      if (this.payment() === 'debt') {
        if (this.customerId() === 'new') {
          // Сразу выбираем созданного покупателя, чтобы при ошибке не завести его дважды.
          this.customerId.set(this.store.addCustomer(this.newName, this.newPhone).id);
          this.newName = this.newPhone = '';
        }
        customerId = this.customerId();
      }
      const sale = this.store.sell(this.cart.lines(), this.payment(), customerId);
      this.cart.clear();
      this.lastSale.set(sale);
      this.payment.set('cash');
      this.customerId.set('');
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

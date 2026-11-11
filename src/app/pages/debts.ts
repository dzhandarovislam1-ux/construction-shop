import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer } from '../core/models';
import { MoneyPipe } from '../core/pipes';
import { Store } from '../core/store';

@Component({
  selector: 'app-debts',
  imports: [FormsModule, MoneyPipe, DatePipe],
  template: `
    <div class="page-head">
      <div>
        <h1>Долги покупателей</h1>
        <p class="muted">
          Всего должны: <b class="accent">{{ store.totalDebt() | money }}</b>
        </p>
      </div>
      <button class="btn primary" (click)="openAdd()">+ Покупатель</button>
    </div>

    <div class="list">
      @for (r of rows(); track r.c.id) {
        <div class="line row">
          <span class="grow">
            <b>{{ r.c.name }}</b>
            @if (r.c.phone) {
              <br /><a class="muted" [href]="'tel:' + r.c.phone">{{ r.c.phone }}</a>
            }
          </span>
          <b [class.accent]="r.debt > 0" [class.muted]="r.debt <= 0">{{ r.debt | money }}</b>
          <button class="btn small" (click)="history.set(r.c)">История</button>
          <button class="btn small primary" [disabled]="r.debt <= 0" (click)="openPay(r.c, r.debt)">
            Принять оплату
          </button>
        </div>
      } @empty {
        <p class="empty">Покупателей пока нет. Они появятся при первой продаже в долг.</p>
      }
    </div>

    @if (adding()) {
      <div class="backdrop">
        <form class="modal" style="max-width: 420px" (ngSubmit)="add()">
          <h2>Новый покупатель</h2>
          <label class="field">Имя<input class="input" name="name" [(ngModel)]="name" /></label>
          <label class="field">Телефон<input class="input" name="phone" type="tel" [(ngModel)]="phone" /></label>
          @if (error()) {
            <p class="alert">{{ error() }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn" (click)="adding.set(false)">Отмена</button>
            <button type="submit" class="btn primary">Добавить</button>
          </div>
        </form>
      </div>
    }

    @if (paying(); as c) {
      <div class="backdrop">
        <form class="modal" style="max-width: 420px" (ngSubmit)="pay(c)">
          <h2>Оплата долга</h2>
          <p class="muted">{{ c.name }} · долг {{ store.debts().get(c.id) ?? 0 | money }}</p>
          <label class="field">
            Сумма
            <input class="input" type="number" name="amount" [(ngModel)]="amount" min="0" step="any" />
          </label>
          @if (error()) {
            <p class="alert">{{ error() }}</p>
          }
          <div class="modal-actions">
            <button type="button" class="btn" (click)="paying.set(null)">Отмена</button>
            <button type="submit" class="btn primary">Принять</button>
          </div>
        </form>
      </div>
    }

    @if (history(); as c) {
      <div class="backdrop">
        <div class="modal">
          <h2>{{ c.name }}</h2>
          <div class="list">
            @for (e of events(); track e.id) {
              <div class="line">
                <span class="grow">
                  {{ e.title }}<br /><small class="muted">{{ e.date | date: 'dd.MM.yyyy HH:mm' }}</small>
                </span>
                <b [class.ok]="e.amount < 0" [class.accent]="e.amount > 0">
                  {{ e.amount > 0 ? '+' : '−' }}{{ (e.amount > 0 ? e.amount : -e.amount) | money }}
                </b>
              </div>
            } @empty {
              <p class="muted">Операций пока нет</p>
            }
          </div>
          <div class="modal-actions">
            <button class="btn" (click)="history.set(null)">Закрыть</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Debts {
  protected readonly store = inject(Store);

  protected readonly adding = signal(false);
  protected readonly paying = signal<Customer | null>(null);
  protected readonly history = signal<Customer | null>(null);
  protected readonly error = signal('');
  protected name = '';
  protected phone = '';
  protected amount: number | null = null;

  protected readonly rows = computed(() => {
    const debts = this.store.debts();
    return this.store
      .customers()
      .map((c) => ({ c, debt: debts.get(c.id) ?? 0 }))
      .sort((a, b) => b.debt - a.debt);
  });

  /** Продажи в долг (+) и оплаты (−) выбранного покупателя. */
  protected readonly events = computed(() => {
    const id = this.history()?.id;
    if (!id) return [];
    const sales = this.store
      .sales()
      .filter((s) => s.customerId === id && s.payment === 'debt' && !s.canceled)
      .map((s) => ({
        id: s.id,
        date: s.date,
        amount: s.total,
        title: 'Взял в долг: ' + s.items.map((i) => i.name).join(', '),
      }));
    const pays = this.store
      .payments()
      .filter((p) => p.customerId === id)
      .map((p) => ({ id: p.id, date: p.date, amount: -p.amount, title: 'Оплата долга' }));
    return [...sales, ...pays].sort((a, b) => b.date.localeCompare(a.date));
  });

  protected openAdd() {
    this.name = this.phone = '';
    this.error.set('');
    this.adding.set(true);
  }

  protected add() {
    try {
      this.store.addCustomer(this.name, this.phone);
      this.adding.set(false);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  protected openPay(c: Customer, debt: number) {
    this.amount = debt;
    this.error.set('');
    this.paying.set(c);
  }

  protected pay(c: Customer) {
    try {
      const debt = this.store.debts().get(c.id) ?? 0;
      if (Number(this.amount) > debt) throw new Error('Сумма больше долга');
      this.store.payDebt(c.id, Number(this.amount));
      this.paying.set(null);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}

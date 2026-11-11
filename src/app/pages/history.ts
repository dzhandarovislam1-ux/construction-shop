import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PAYMENT_LABEL, Sale, dayKey, round2 } from '../core/models';
import { MoneyPipe, QtyPipe } from '../core/pipes';
import { Store } from '../core/store';

@Component({
  selector: 'app-history',
  imports: [FormsModule, MoneyPipe, QtyPipe, DatePipe],
  template: `
    <div class="page-head">
      <h1>Продажи за день</h1>
      <input
        class="input"
        style="width: auto"
        type="date"
        [ngModel]="day()"
        (ngModelChange)="day.set($event)"
      />
    </div>

    <div class="stats">
      <div class="card"><small class="muted">Продано</small><b class="accent">{{ stats().total | money }}</b></div>
      <div class="card"><small class="muted">Наличные</small><b>{{ stats().cash | money }}</b></div>
      <div class="card"><small class="muted">Карта</small><b>{{ stats().card | money }}</b></div>
      <div class="card"><small class="muted">В долг</small><b>{{ stats().debt | money }}</b></div>
      <div class="card"><small class="muted">Вернули долгов</small><b>{{ stats().repaid | money }}</b></div>
      <div class="card"><small class="muted">Прибыль</small><b class="ok">{{ stats().profit | money }}</b></div>
    </div>

    <div class="list">
      @for (s of sales(); track s.id) {
        <div class="line sale" [class.canceled]="s.canceled">
          <span class="grow">
            <b>{{ s.date | date: 'HH:mm' }}</b>
            <span class="badge">{{ paymentLabel[s.payment] }}</span>
            @if (s.customerId) {
              <span class="muted"> {{ store.customer(s.customerId)?.name }}</span>
            }
            @if (s.canceled) {
              <span class="badge out">Отменена</span>
            }
            <br />
            <small class="muted">
              @for (i of s.items; track i.productId; let last = $last) {
                {{ i.name }} — {{ i.qty | qty }} {{ i.unit }}{{ last ? '' : '; ' }}
              }
            </small>
          </span>
          <b>{{ s.total | money }}</b>
          @if (!s.canceled) {
            <button class="btn small ghost danger" (click)="cancel(s)">Отменить</button>
          }
        </div>
      } @empty {
        <p class="empty">В этот день продаж не было</p>
      }
    </div>
  `,
  styles: `
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stats .card { display: grid; gap: 4px; }
    .stats b { font-size: 20px; }
    .canceled { opacity: 0.5; }
    .canceled > b { text-decoration: line-through; }
    .badge { margin-left: 6px; }
  `,
})
export class History {
  protected readonly store = inject(Store);
  protected readonly paymentLabel = PAYMENT_LABEL;
  protected readonly day = signal(dayKey(new Date()));

  protected readonly sales = computed(() =>
    this.store.sales().filter((s) => dayKey(s.date) === this.day()),
  );

  protected readonly stats = computed(() => {
    const st = { total: 0, cash: 0, card: 0, debt: 0, profit: 0, repaid: 0 };
    for (const s of this.sales()) {
      if (s.canceled) continue;
      st.total += s.total;
      st[s.payment] += s.total;
      st.profit += s.items.reduce((a, i) => a + (i.price - i.cost) * i.qty, 0);
    }
    for (const p of this.store.payments()) {
      if (dayKey(p.date) === this.day()) st.repaid += p.amount;
    }
    for (const k of Object.keys(st) as (keyof typeof st)[]) st[k] = round2(st[k]);
    return st;
  });

  protected cancel(s: Sale) {
    if (confirm('Отменить продажу? Товар вернётся на склад.')) this.store.cancelSale(s.id);
  }
}

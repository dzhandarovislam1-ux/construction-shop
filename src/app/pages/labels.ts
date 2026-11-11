import { Component, computed, effect, inject, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
import { MoneyPipe } from '../core/pipes';
import { Store } from '../core/store';

@Component({
  selector: 'app-labels',
  imports: [MoneyPipe],
  template: `
    <div class="no-print">
      <div class="page-head">
        <h1>QR-ценники</h1>
        <button class="btn primary" [disabled]="!selected().size" (click)="print()">
          🖨 Печать · {{ selected().size }}
        </button>
      </div>
      <p class="muted" style="margin-bottom: 14px">
        Отметьте товары и нажмите «Печать». QR ведёт на страницу товара с ценой и наличием, а на
        кассе по нему товар добавляется в чек.
      </p>
      <div class="row" style="margin-bottom: 12px">
        <button class="btn small" (click)="selectAll()">Выбрать все</button>
        <button class="btn small" (click)="selected.set(empty)">Снять выбор</button>
      </div>
      <div class="pick">
        @for (p of store.products(); track p.id) {
          <label class="line">
            <input type="checkbox" [checked]="selected().has(p.id)" (change)="toggle(p.id)" />
            <span class="grow">{{ p.name }}</span>
            <b class="accent">{{ p.sellPrice | money }}</b>
          </label>
        } @empty {
          <p class="empty">Сначала добавьте товары</p>
        }
      </div>
      @if (labels().length) {
        <h2 style="margin: 24px 0 12px">Так будет на бумаге</h2>
      }
    </div>

    <div class="sheet">
      @for (l of labels(); track l.id) {
        <div class="label">
          <div class="info">
            <span class="name">{{ l.name }}</span>
            <span class="price">{{ l.sellPrice | money }}<small> / {{ l.unit }}</small></span>
            <span class="sku">{{ l.sku }}</span>
          </div>
          @if (codes()[l.id]; as src) {
            <img [src]="src" alt="QR-код" />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .pick { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
    .pick .line { cursor: pointer; }
    .pick input { width: 18px; height: 18px; accent-color: var(--accent); }
    .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; }
    .label { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px dashed #888; border-radius: 6px; background: #fff; color: #000; break-inside: avoid; }
    .info { flex: 1; min-width: 0; display: grid; gap: 4px; }
    .name { font-weight: 700; font-size: 14px; line-height: 1.2; }
    .price { font-size: 24px; font-weight: 800; }
    .price small { font-size: 12px; font-weight: 500; }
    .sku { font-size: 11px; color: #555; }
    img { width: 96px; height: 96px; flex: none; }
    @media print { .sheet { grid-template-columns: repeat(3, 1fr); gap: 0; } .label { border-radius: 0; } }
  `,
})
export class Labels {
  protected readonly store = inject(Store);
  protected readonly empty = new Set<string>();
  protected readonly selected = signal<Set<string>>(this.empty);
  /** Картинки QR-кодов по id товара. */
  protected readonly codes = signal<Record<string, string>>({});

  protected readonly labels = computed(() =>
    this.store.products().filter((p) => this.selected().has(p.id)),
  );

  constructor() {
    effect(() => {
      const items = this.labels().map((p) => ({ id: p.id, url: this.store.productUrl(p.id) }));
      Promise.all(
        items.map(async (i) => [i.id, await toDataURL(i.url, { margin: 1, width: 240 })] as const),
      ).then((pairs) => this.codes.set(Object.fromEntries(pairs)));
    });
  }

  protected toggle(id: string) {
    this.selected.update((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected selectAll() {
    this.selected.set(new Set(this.store.products().map((p) => p.id)));
  }

  protected print() {
    window.print();
  }
}

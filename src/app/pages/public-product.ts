import { Component, computed, inject, input } from '@angular/core';
import { categoryOf } from '../core/models';
import { MoneyPipe, QtyPipe } from '../core/pipes';
import { Store } from '../core/store';

/** Страница товара для покупателя — открывается по QR-коду с ценника. */
@Component({
  selector: 'app-public-product',
  imports: [MoneyPipe, QtyPipe],
  template: `
    <main>
      <p class="store">🛠 {{ store.settings().storeName }}</p>
      @if (product(); as p) {
        <article class="card">
          <span class="icon">{{ icon() }}</span>
          <h1>{{ p.name }}</h1>
          @if (p.sku) {
            <p class="muted">Артикул: {{ p.sku }}</p>
          }
          <p class="price">{{ p.sellPrice | money }} <small>/ {{ p.unit }}</small></p>
          @if (p.stock > 0) {
            <p class="badge ok">В наличии: {{ p.stock | qty }} {{ p.unit }}</p>
          } @else {
            <p class="badge out">Нет в наличии</p>
          }
        </article>
      } @else {
        <article class="card">
          <h1>Товар не найден</h1>
          <p class="muted">Возможно, он снят с продажи. Спросите у продавца.</p>
        </article>
      }
      @if (store.settings().phone; as phone) {
        <a class="btn primary big" [href]="'tel:' + phone">📞 Позвонить в магазин</a>
      }
    </main>
  `,
  styles: `
    main { max-width: 440px; margin: 0 auto; padding: 28px 16px; display: grid; gap: 16px; }
    .store { font-weight: 800; font-size: 18px; text-align: center; }
    .card { display: grid; gap: 10px; justify-items: center; text-align: center; padding: 28px 20px; }
    .icon { display: grid; place-items: center; width: 84px; height: 84px; border-radius: 20px; background: rgba(255, 194, 26, 0.12); border: 1px solid rgba(255, 194, 26, 0.3); font-size: 42px; }
    .price { font-size: 44px; font-weight: 800; color: var(--accent); line-height: 1.1; }
    .price small { font-size: 16px; font-weight: 500; color: var(--muted); }
    .badge { font-size: 15px; padding: 6px 14px; }
  `,
})
export class PublicProduct {
  protected readonly store = inject(Store);
  /** Параметр адреса /p/:id */
  readonly id = input('');
  protected readonly product = computed(() => this.store.product(this.id()));
  protected readonly icon = computed(() => categoryOf(this.product()?.category ?? 'other').icon);
}

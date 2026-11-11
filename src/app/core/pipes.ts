import { Pipe, PipeTransform, inject } from '@angular/core';
import { Store } from './store';

/** Сумма с валютой магазина: 12 500 ₽ */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private store = inject(Store);
  transform(v: number | null | undefined): string {
    const n = (v ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    return `${n} ${this.store.settings().currency}`;
  }
}

/** Количество без лишних нулей: 35,5 */
@Pipe({ name: 'qty' })
export class QtyPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return (v ?? 0).toLocaleString('ru-RU', { maximumFractionDigits: 3 });
  }
}

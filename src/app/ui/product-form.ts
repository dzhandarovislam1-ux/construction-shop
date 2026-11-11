import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORIES, CategoryId, Product, UNITS, Unit } from '../core/models';
import { Store } from '../core/store';
import { Scanner } from './scanner';

/** Окно создания и изменения товара. */
@Component({
  selector: 'app-product-form',
  imports: [FormsModule, Scanner],
  template: `
    <div class="backdrop">
      <form class="modal" (ngSubmit)="save()">
        <h2>{{ product() ? 'Изменить товар' : 'Новый товар' }}</h2>
        <div class="form-grid">
          <label class="field wide">
            Название
            <input class="input" name="name" [(ngModel)]="d.name" placeholder="Например: Цемент М500, 50 кг" />
          </label>
          <label class="field">
            Категория
            <select class="input" name="category" [(ngModel)]="d.category">
              @for (c of categories; track c.id) {
                <option [value]="c.id">{{ c.icon }} {{ c.name }}</option>
              }
            </select>
          </label>
          <label class="field">
            Единица
            <select class="input" name="unit" [(ngModel)]="d.unit">
              @for (u of units; track u) {
                <option [value]="u">{{ u }}</option>
              }
            </select>
          </label>
          <label class="field">
            Цена закупки
            <input class="input" type="number" name="buy" [(ngModel)]="d.buyPrice" min="0" step="any" />
          </label>
          <label class="field">
            Цена продажи
            <input class="input" type="number" name="sell" [(ngModel)]="d.sellPrice" min="0" step="any" />
          </label>
          <label class="field">
            Остаток на складе
            <input class="input" type="number" name="stock" [(ngModel)]="d.stock" step="any" />
          </label>
          <label class="field">
            Минимальный остаток
            <input class="input" type="number" name="min" [(ngModel)]="d.minStock" min="0" step="any" />
          </label>
          <label class="field">
            Артикул
            <input class="input" name="sku" [(ngModel)]="d.sku" />
          </label>
          <label class="field">
            Штрихкод
            <span class="row" style="flex-wrap: nowrap">
              <input class="input" name="barcode" [(ngModel)]="d.barcode" inputmode="numeric" />
              <button type="button" class="btn" title="Сканировать камерой" (click)="scanning.set(true)">📷</button>
            </span>
          </label>
        </div>
        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }
        <div class="modal-actions">
          @if (product()) {
            <button type="button" class="btn danger ghost" style="margin-right: auto" (click)="remove()">Удалить</button>
          }
          <button type="button" class="btn" (click)="closed.emit()">Отмена</button>
          <button type="submit" class="btn primary">Сохранить</button>
        </div>
      </form>
    </div>
    @if (scanning()) {
      <app-scanner (scanned)="d.barcode = $event; scanning.set(false)" (closed)="scanning.set(false)" />
    }
  `,
})
export class ProductForm implements OnInit {
  readonly product = input<Product | null>(null);
  readonly closed = output<void>();

  private readonly store = inject(Store);
  protected readonly categories = CATEGORIES;
  protected readonly units = UNITS;
  protected readonly scanning = signal(false);
  protected readonly error = signal('');

  protected d = {
    name: '',
    sku: '',
    barcode: '',
    category: 'tools' as CategoryId,
    unit: 'шт' as Unit,
    buyPrice: null as number | null,
    sellPrice: null as number | null,
    stock: null as number | null,
    minStock: null as number | null,
  };

  ngOnInit() {
    const p = this.product();
    if (p) this.d = { ...p };
  }

  protected save() {
    const d = this.d;
    const name = d.name.trim();
    if (!name) return this.error.set('Укажите название товара');
    if (!(Number(d.sellPrice) > 0)) return this.error.set('Укажите цену продажи');
    const barcode = d.barcode.trim();
    const id = this.product()?.id;
    if (barcode && this.store.products().some((p) => p.barcode === barcode && p.id !== id)) {
      return this.error.set('Товар с таким штрихкодом уже есть');
    }
    this.store.saveProduct({
      id,
      name,
      sku: d.sku.trim(),
      barcode,
      category: d.category,
      unit: d.unit,
      buyPrice: Number(d.buyPrice) || 0,
      sellPrice: Number(d.sellPrice),
      stock: Number(d.stock) || 0,
      minStock: Number(d.minStock) || 0,
    });
    this.closed.emit();
  }

  protected remove() {
    const p = this.product();
    if (p && confirm(`Удалить товар «${p.name}»? История продаж сохранится.`)) {
      this.store.deleteProduct(p.id);
      this.closed.emit();
    }
  }
}

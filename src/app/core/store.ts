import { Injectable, computed, effect, signal } from '@angular/core';
import {
  CartLine,
  Customer,
  DebtPayment,
  Payment,
  Product,
  Receipt,
  Sale,
  Settings,
  round2,
} from './models';
import { demoData } from './demo-data';

const KEY = 'stroymag.v1';

export interface Db {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  payments: DebtPayment[];
  receipts: Receipt[];
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = { storeName: 'Строймаг', currency: '₽', phone: '', publicUrl: '' };

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function load(): Db | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Db) : null;
  } catch {
    return null;
  }
}

/** Все данные магазина. Хранятся в браузере (localStorage). */
@Injectable({ providedIn: 'root' })
export class Store {
  readonly products = signal<Product[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly sales = signal<Sale[]>([]);
  readonly payments = signal<DebtPayment[]>([]);
  readonly receipts = signal<Receipt[]>([]);
  readonly settings = signal<Settings>(DEFAULT_SETTINGS);

  /** Не удалось сохранить (например, переполнено хранилище браузера). */
  readonly saveError = signal(false);

  /** Долг каждого покупателя: продажи в долг минус погашения. */
  readonly debts = computed(() => {
    const m = new Map<string, number>();
    for (const s of this.sales()) {
      if (s.payment === 'debt' && !s.canceled && s.customerId) {
        m.set(s.customerId, (m.get(s.customerId) ?? 0) + s.total);
      }
    }
    for (const p of this.payments()) {
      m.set(p.customerId, (m.get(p.customerId) ?? 0) - p.amount);
    }
    for (const [k, v] of m) m.set(k, round2(v));
    return m;
  });

  readonly totalDebt = computed(() =>
    round2([...this.debts().values()].reduce((a, v) => a + Math.max(v, 0), 0)),
  );

  readonly lowStock = computed(() => this.products().filter((p) => p.stock <= p.minStock));

  constructor() {
    this.apply(load() ?? demoData());
    effect(() => {
      const snapshot = JSON.stringify(this.snapshot());
      try {
        localStorage.setItem(KEY, snapshot);
        this.saveError.set(false);
      } catch {
        this.saveError.set(true);
      }
    });
  }

  snapshot(): Db {
    return {
      products: this.products(),
      customers: this.customers(),
      sales: this.sales(),
      payments: this.payments(),
      receipts: this.receipts(),
      settings: this.settings(),
    };
  }

  private apply(db: Partial<Db>) {
    this.products.set(db.products ?? []);
    this.customers.set(db.customers ?? []);
    this.sales.set(db.sales ?? []);
    this.payments.set(db.payments ?? []);
    this.receipts.set(db.receipts ?? []);
    this.settings.set({ ...DEFAULT_SETTINGS, ...db.settings });
  }

  /** Загрузить резервную копию, полностью заменив текущие данные. */
  importJson(text: string) {
    const db = JSON.parse(text) as Partial<Db>;
    if (!db || !Array.isArray(db.products) || !Array.isArray(db.sales)) {
      throw new Error('Это не файл резервной копии магазина');
    }
    this.apply(db);
  }

  /** Удалить все данные, настройки магазина остаются. */
  clearAll() {
    this.apply({ settings: this.settings() });
  }

  // ---------- Товары ----------

  product(id: string) {
    return this.products().find((p) => p.id === id);
  }

  saveProduct(p: Omit<Product, 'id'> & { id?: string }): Product {
    const saved: Product = { ...p, id: p.id ?? uid() };
    this.products.update((list) =>
      p.id ? list.map((x) => (x.id === p.id ? saved : x)) : [saved, ...list],
    );
    return saved;
  }

  deleteProduct(id: string) {
    this.products.update((list) => list.filter((p) => p.id !== id));
  }

  /** Приход товара: увеличивает остаток и обновляет закупочную цену. */
  receive(productId: string, qty: number, buyPrice: number) {
    if (!(qty > 0)) throw new Error('Укажите количество больше нуля');
    this.changeStock(productId, qty, buyPrice);
    this.receipts.update((l) => [
      { id: uid(), productId, date: new Date().toISOString(), qty, buyPrice },
      ...l,
    ]);
  }

  private changeStock(productId: string, delta: number, buyPrice?: number) {
    this.products.update((list) =>
      list.map((p) =>
        p.id === productId
          ? { ...p, stock: round2(p.stock + delta), buyPrice: buyPrice ?? p.buyPrice }
          : p,
      ),
    );
  }

  /**
   * Найти товар по отсканированному тексту: ссылка из QR-ценника,
   * штрихкод или артикул.
   */
  findByCode(text: string): Product | undefined {
    const t = text.trim();
    if (!t) return undefined;
    const m = t.match(/\/p\/([\w-]+)/);
    if (m) return this.product(m[1]);
    const low = t.toLowerCase();
    return this.products().find(
      (p) => (p.barcode && p.barcode === t) || (p.sku && p.sku.toLowerCase() === low),
    );
  }

  /** Ссылка на страницу товара — она зашита в QR-ценник. */
  productUrl(id: string): string {
    const base = (this.settings().publicUrl.trim() || document.baseURI)
      .replace(/[#?].*$/, '')
      .replace(/\/+$/, '');
    return `${base}/#/p/${id}`;
  }

  // ---------- Продажи ----------

  sell(lines: CartLine[], payment: Payment, customerId?: string): Sale {
    if (!lines.length) throw new Error('Чек пуст');
    if (lines.some((l) => !(l.qty > 0))) throw new Error('Количество должно быть больше нуля');
    if (lines.some((l) => !(l.price >= 0))) throw new Error('Проверьте цены в чеке');
    if (payment === 'debt' && !customerId) throw new Error('Выберите покупателя для продажи в долг');

    const items = lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      unit: l.unit,
      qty: l.qty,
      price: l.price,
      cost: this.product(l.productId)?.buyPrice ?? 0,
    }));
    const sale: Sale = {
      id: uid(),
      date: new Date().toISOString(),
      items,
      total: round2(items.reduce((a, i) => a + i.qty * i.price, 0)),
      payment,
      customerId: payment === 'debt' ? customerId : undefined,
    };
    for (const i of items) this.changeStock(i.productId, -i.qty);
    this.sales.update((l) => [sale, ...l]);
    return sale;
  }

  /** Отмена продажи: товар возвращается на склад, долг списывается. */
  cancelSale(id: string) {
    const sale = this.sales().find((s) => s.id === id);
    if (!sale || sale.canceled) return;
    for (const i of sale.items) this.changeStock(i.productId, i.qty);
    this.sales.update((l) => l.map((s) => (s.id === id ? { ...s, canceled: true } : s)));
  }

  // ---------- Покупатели и долги ----------

  customer(id: string | undefined) {
    return this.customers().find((c) => c.id === id);
  }

  addCustomer(name: string, phone: string): Customer {
    if (!name.trim()) throw new Error('Укажите имя покупателя');
    const c: Customer = { id: uid(), name: name.trim(), phone: phone.trim() };
    this.customers.update((l) => [c, ...l]);
    return c;
  }

  payDebt(customerId: string, amount: number) {
    if (!(amount > 0)) throw new Error('Укажите сумму больше нуля');
    this.payments.update((l) => [
      { id: uid(), customerId, date: new Date().toISOString(), amount: round2(amount) },
      ...l,
    ]);
  }
}

/** Текущий чек на кассе. */
@Injectable({ providedIn: 'root' })
export class Cart {
  readonly lines = signal<CartLine[]>([]);
  readonly total = computed(() =>
    round2(this.lines().reduce((a, l) => a + (l.qty || 0) * (l.price || 0), 0)),
  );

  add(p: Product, qty = 1) {
    this.lines.update((lines) =>
      lines.some((l) => l.productId === p.id)
        ? lines.map((l) => (l.productId === p.id ? { ...l, qty: round2(l.qty + qty) } : l))
        : [...lines, { productId: p.id, name: p.name, unit: p.unit, qty, price: p.sellPrice }],
    );
  }

  patch(productId: string, change: Partial<Pick<CartLine, 'qty' | 'price'>>) {
    this.lines.update((lines) =>
      lines.map((l) => (l.productId === productId ? { ...l, ...change } : l)),
    );
  }

  remove(productId: string) {
    this.lines.update((lines) => lines.filter((l) => l.productId !== productId));
  }

  clear() {
    this.lines.set([]);
  }
}

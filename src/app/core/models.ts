export const UNITS = ['шт', 'м', 'м²', 'м³', 'кг', 'л', 'мешок', 'уп', 'лист', 'рулон'] as const;
export type Unit = (typeof UNITS)[number];

export const CATEGORIES = [
  { id: 'tools', name: 'Инструмент', icon: '🔨' },
  { id: 'power', name: 'Электроинструмент', icon: '⚡' },
  { id: 'fasteners', name: 'Крепёж', icon: '🔩' },
  { id: 'mixes', name: 'Смеси и цемент', icon: '🧱' },
  { id: 'paint', name: 'Краски', icon: '🎨' },
  { id: 'wood', name: 'Пиломатериалы', icon: '🪵' },
  { id: 'electric', name: 'Электрика', icon: '💡' },
  { id: 'plumbing', name: 'Сантехника', icon: '🚿' },
  { id: 'other', name: 'Прочее', icon: '📦' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

export function categoryOf(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: CategoryId;
  unit: Unit;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  /** Остаток, при котором товар попадает в «заканчиваются». */
  minStock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export type Payment = 'cash' | 'card' | 'debt';
export const PAYMENT_LABEL: Record<Payment, string> = {
  cash: 'Наличные',
  card: 'Карта',
  debt: 'В долг',
};

export interface SaleItem {
  productId: string;
  name: string;
  unit: Unit;
  qty: number;
  price: number;
  /** Закупочная цена на момент продажи — для расчёта прибыли. */
  cost: number;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  total: number;
  payment: Payment;
  customerId?: string;
  canceled?: boolean;
}

/** Погашение долга покупателем. */
export interface DebtPayment {
  id: string;
  customerId: string;
  date: string;
  amount: number;
}

/** Приход товара на склад. */
export interface Receipt {
  id: string;
  productId: string;
  date: string;
  qty: number;
  buyPrice: number;
}

export interface Settings {
  storeName: string;
  currency: string;
  phone: string;
  /** Адрес сайта для QR-кодов. Пусто — берётся текущий адрес. */
  publicUrl: string;
}

export interface CartLine {
  productId: string;
  name: string;
  unit: Unit;
  qty: number;
  price: number;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Локальная дата в виде ГГГГ-ММ-ДД. */
export function dayKey(d: string | Date): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

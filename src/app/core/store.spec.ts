import { TestBed } from '@angular/core/testing';
import { Product } from './models';
import { Cart, Store } from './store';

describe('Store', () => {
  let store: Store;
  let cement: Product;

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(Store);
    store.clearAll();
    cement = store.saveProduct({
      name: 'Цемент',
      sku: 'CEM-1',
      barcode: '4600000000017',
      category: 'mixes',
      unit: 'мешок',
      buyPrice: 400,
      sellPrice: 500,
      stock: 10,
      minStock: 3,
    });
  });

  const line = (qty: number, price = 500) => [
    { productId: cement.id, name: cement.name, unit: cement.unit, qty, price },
  ];

  it('продажа уменьшает остаток и считает сумму', () => {
    const sale = store.sell(line(4), 'cash');
    expect(sale.total).toBe(2000);
    expect(store.product(cement.id)!.stock).toBe(6);
  });

  it('приход увеличивает остаток и обновляет закупочную цену', () => {
    store.receive(cement.id, 5.5, 420);
    expect(store.product(cement.id)!.stock).toBe(15.5);
    expect(store.product(cement.id)!.buyPrice).toBe(420);
  });

  it('товар попадает в «заканчиваются» при достижении минимума', () => {
    expect(store.lowStock().length).toBe(0);
    store.sell(line(7), 'card');
    expect(store.lowStock().map((p) => p.id)).toEqual([cement.id]);
  });

  it('продажа в долг требует покупателя и увеличивает его долг', () => {
    expect(() => store.sell(line(1), 'debt')).toThrow();
    const c = store.addCustomer('Иван', '');
    store.sell(line(2), 'debt', c.id);
    expect(store.debts().get(c.id)).toBe(1000);
    store.payDebt(c.id, 300);
    expect(store.debts().get(c.id)).toBe(700);
    expect(store.totalDebt()).toBe(700);
  });

  it('отмена продажи возвращает товар и списывает долг', () => {
    const c = store.addCustomer('Иван', '');
    const sale = store.sell(line(2), 'debt', c.id);
    store.cancelSale(sale.id);
    store.cancelSale(sale.id); // повторная отмена ничего не меняет
    expect(store.product(cement.id)!.stock).toBe(10);
    expect(store.debts().get(c.id) ?? 0).toBe(0);
  });

  it('не продаёт пустой чек и нулевое количество', () => {
    expect(() => store.sell([], 'cash')).toThrow();
    expect(() => store.sell(line(0), 'cash')).toThrow();
    expect(store.sales().length).toBe(0);
  });

  it('находит товар по ссылке из QR, штрихкоду и артикулу', () => {
    expect(store.findByCode(store.productUrl(cement.id))?.id).toBe(cement.id);
    expect(store.findByCode('4600000000017')?.id).toBe(cement.id);
    expect(store.findByCode('cem-1')?.id).toBe(cement.id);
    expect(store.findByCode('нет такого')).toBeUndefined();
  });

  it('сохраняет данные и восстанавливает их из копии', () => {
    store.sell(line(1), 'cash');
    const copy = JSON.stringify(store.snapshot());
    store.clearAll();
    expect(store.products().length).toBe(0);
    store.importJson(copy);
    expect(store.product(cement.id)!.stock).toBe(9);
    expect(() => store.importJson('{"foo":1}')).toThrow();
  });

  it('корзина складывает одинаковые товары', () => {
    const cart = TestBed.inject(Cart);
    cart.add(cement);
    cart.add(cement, 2);
    expect(cart.lines().length).toBe(1);
    expect(cart.total()).toBe(1500);
  });
});

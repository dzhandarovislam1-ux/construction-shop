import type { Db } from './store';
import { Product } from './models';

/** Примеры товаров для первого запуска. Удаляются в «Настройках». */
export function demoData(): Partial<Db> {
  const p = (
    id: string,
    name: string,
    category: Product['category'],
    unit: Product['unit'],
    buyPrice: number,
    sellPrice: number,
    stock: number,
    minStock: number,
    barcode = '',
  ): Product => ({ id, name, sku: id.toUpperCase(), barcode, category, unit, buyPrice, sellPrice, stock, minStock });

  return {
    products: [
      p('d01', 'Молоток слесарный 500 г', 'tools', 'шт', 320, 490, 14, 3),
      p('d02', 'Рулетка 5 м', 'tools', 'шт', 180, 290, 22, 5),
      p('d03', 'Уровень строительный 60 см', 'tools', 'шт', 450, 690, 6, 2),
      p('d04', 'Шуруповёрт аккумуляторный 18 В', 'power', 'шт', 4200, 5900, 3, 2),
      p('d05', 'Саморез по дереву 4×50', 'fasteners', 'кг', 190, 290, 35.5, 10),
      p('d06', 'Дюбель-гвоздь 6×40 (100 шт)', 'fasteners', 'уп', 110, 180, 2, 5),
      p('d07', 'Цемент М500, 50 кг', 'mixes', 'мешок', 410, 520, 48, 15),
      p('d08', 'Штукатурка гипсовая, 30 кг', 'mixes', 'мешок', 380, 490, 12, 10),
      p('d09', 'Краска водоэмульсионная белая 10 л', 'paint', 'шт', 1250, 1690, 7, 3),
      p('d10', 'Кисть плоская 50 мм', 'paint', 'шт', 60, 120, 40, 10),
      p('d11', 'Брус 50×50, сосна', 'wood', 'м', 55, 85, 120, 30),
      p('d12', 'Кабель ВВГ 3×2,5', 'electric', 'м', 78, 115, 0, 50),
    ],
    customers: [{ id: 'c01', name: 'Бригада Ахмеда', phone: '' }],
  };
}

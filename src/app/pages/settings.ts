import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { dayKey } from '../core/models';
import { Store } from '../core/store';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    <div class="page-head"><h1>Настройки</h1></div>

    <div class="stack" style="max-width: 640px">
      <form class="card stack" (ngSubmit)="save()">
        <h2>Магазин</h2>
        <div class="form-grid">
          <label class="field wide">
            Название магазина
            <input class="input" name="storeName" [(ngModel)]="d.storeName" />
          </label>
          <label class="field">
            Валюта
            <input class="input" name="currency" [(ngModel)]="d.currency" placeholder="₽" />
          </label>
          <label class="field">
            Телефон магазина
            <input class="input" name="phone" type="tel" [(ngModel)]="d.phone" />
          </label>
          <label class="field wide">
            Адрес сайта для QR-кодов
            <input class="input" name="publicUrl" [(ngModel)]="d.publicUrl" placeholder="Пусто — текущий адрес" />
          </label>
        </div>
        <div class="row">
          <button class="btn primary" type="submit">Сохранить</button>
          @if (saved()) {
            <span class="ok">Сохранено</span>
          }
        </div>
      </form>

      <section class="card stack">
        <h2>Резервная копия</h2>
        <p class="muted">
          Все данные хранятся в этом браузере на этом устройстве. Если очистить историю браузера или
          сменить устройство, они пропадут. Скачивайте копию регулярно.
        </p>
        <div class="row">
          <button class="btn primary" (click)="exportFile()">⬇ Скачать копию</button>
          <label class="btn">
            ⬆ Загрузить из копии
            <input type="file" accept="application/json,.json" hidden (change)="importFile($event)" />
          </label>
        </div>
        @if (message()) {
          <p [class]="failed() ? 'alert' : 'notice'">{{ message() }}</p>
        }
      </section>

      <section class="card stack">
        <h2>Очистка</h2>
        <p class="muted">Удаляет все товары, продажи, покупателей и долги, включая примеры.</p>
        <div><button class="btn danger" (click)="clear()">Удалить все данные</button></div>
      </section>
    </div>
  `,
})
export class SettingsPage {
  private readonly store = inject(Store);
  protected d = { ...this.store.settings() };
  protected readonly saved = signal(false);
  protected readonly message = signal('');
  protected readonly failed = signal(false);

  protected save() {
    this.store.settings.set({
      ...this.d,
      storeName: this.d.storeName.trim() || 'Строймаг',
      currency: this.d.currency.trim() || '₽',
    });
    this.d = { ...this.store.settings() };
    this.saved.set(true);
  }

  protected exportFile() {
    const blob = new Blob([JSON.stringify(this.store.snapshot(), null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stroymag-${dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected async importFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!confirm('Текущие данные будут заменены данными из файла. Продолжить?')) return;
    try {
      this.store.importJson(await file.text());
      this.d = { ...this.store.settings() };
      this.failed.set(false);
      this.message.set('Данные загружены из копии');
    } catch (e) {
      this.failed.set(true);
      this.message.set(
        e instanceof SyntaxError ? 'Файл повреждён или это не резервная копия' : (e as Error).message,
      );
    }
  }

  protected clear() {
    if (confirm('Удалить ВСЕ данные магазина? Это действие нельзя отменить.')) {
      this.store.clearAll();
      this.failed.set(false);
      this.message.set('Все данные удалены');
    }
  }
}

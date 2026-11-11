import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash-адреса (/#/p/123) работают на любом статическом хостинге без настройки сервера.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
  ],
};

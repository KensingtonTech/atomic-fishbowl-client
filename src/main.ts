import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { Logger } from 'loglevel';
declare var log: Logger;

if (environment.production) {
  enableProdMode();
  log.setLevel('warn');
}
else {
  log.setLevel('trace');
}

platformBrowserDynamic().bootstrapModule(AppModule);

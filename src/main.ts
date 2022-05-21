import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import * as log from 'loglevel';
import 'types/global';

(window as any).log = log;

if (environment.production) {
  enableProdMode();
  log.setLevel('warn');
}
else {
  log.setLevel('trace');
}

platformBrowserDynamic().bootstrapModule(AppModule);

import { Injectable, isDevMode } from '@angular/core';

@Injectable()

export class LoggerService {

  isDevMode: boolean;

  constructor () { this.isDevMode = isDevMode(); }

  //if in dev mode, we will log everything
  //if in prod mode, we will log only console, warning, and error
  //logConsole should be used sparingly

  logConsole(msg: any): void {
    console.log(msg);
  }

  logDebug(msg: any): void {
    if ( this.isDevMode ) {
      console.debug(msg);
    }
  }

  logWarning(msg: any): void {
    console.error(msg);
  }

  logError(msg: any): void {
    console.error(msg);
  }

}

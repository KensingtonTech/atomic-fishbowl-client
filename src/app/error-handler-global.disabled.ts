import { Injectable, ErrorHandler, Injector } from '@angular/core';
import { Logger } from 'loglevel';
declare var log: Logger;

@Injectable()
export class ErrorHandlerGlobal implements ErrorHandler {
  // https://medium.com/@amcdnl/global-error-handling-with-angular2-6b992bdfb59c

  constructor(private injector: Injector) {}

  pdfErrors = [
    'Unable to initialize viewer Error: Transport destroyed',
    `Uncaught (in promise): TypeError: Cannot read property 'div' of undefined
TypeError: Cannot read property 'div' of undefined
    at backtrackBeforeAllVisibleElements`
  ];

  handleError(error: any) {
    console.log('handleError(): got to 1');
    for (let i = 0; i < this.pdfErrors.length; i++) {
      let msg = this.pdfErrors[i];
      if (error.message.startsWith(msg)) {
        // https://github.com/VadimDez/ng2-pdf-viewer/issues/367
        log.debug('ignoring pdfjs error');
        return;
      }
    }
    console.error(error);
  }
}

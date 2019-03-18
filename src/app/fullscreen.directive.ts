import { Directive, HostListener } from '@angular/core';
import { Logger } from 'loglevel';
// import * as screenfull from 'screenfull';
declare var screenfull;
declare var log: Logger;


@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[toggleFullscreen]'
})
export class ToggleFullscreenDirective {

  @HostListener('click') onClick() {
    if (screenfull.enabled) {
      screenfull.toggle();
    }
  }
}

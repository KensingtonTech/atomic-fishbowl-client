import { Directive, HostListener } from '@angular/core';
import screenfull from 'screenfull';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[toggleFullscreen]'
})
export class ToggleFullscreenDirective {

  @HostListener('click') onClick() {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  }
}

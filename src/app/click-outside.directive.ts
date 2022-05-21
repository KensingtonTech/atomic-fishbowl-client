import {
  Directive,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';
import * as log from 'loglevel';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[clickOutside]'
})
export class ClickOutsideDirective {
  constructor() {}

  @Output() clickOutside = new EventEmitter();

  @HostListener('document:click', ['$event']) onClick(event: MouseEvent) {
    if (!event.target) {
      return;
    }
    const targetElement = event.target as HTMLElement;
    const classList = targetElement.classList;
    if (!classList.contains('routerIcon')) {
      this.clickOutside.emit();
    }
  }
}

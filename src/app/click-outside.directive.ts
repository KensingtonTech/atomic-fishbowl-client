import { Directive, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';
import * as log from 'loglevel';

@Directive({
    selector: '[clickOutside]'
})
export class ClickOutsideDirective {

    constructor(private el: ElementRef ) {}

    @Output() clickOutside = new EventEmitter();

    @HostListener('document:click', ['$event']) onClick(event: any) {
        log.debug('ClickOutsideDirective: onClick(): event.target:', event.target);
        const targetElement: Element = event.target;
        const classList = targetElement.classList;
        log.debug('ClickOutsideDirective: onClick(): classList:', classList);
        let clickedInside = false;

        if (classList.contains('routerIcon')) {
            clickedInside = true;
        }

        log.debug('ClickOutsideDirective: onClick(): el:', this.el.nativeElement);
        log.debug('ClickOutsideDirective: onClick(): clickedInside:', clickedInside);

        if (!clickedInside) {
            this.clickOutside.emit();
        }
    }

}

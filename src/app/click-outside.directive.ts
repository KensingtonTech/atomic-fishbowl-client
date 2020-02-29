import { Directive, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';
import * as log from 'loglevel';

@Directive({
    // tslint:disable-next-line:directive-selector
    selector: '[clickOutside]'
})
export class ClickOutsideDirective {

    constructor(private el: ElementRef ) {}

    private classesToFind = 5;

    @Output() clickOutside = new EventEmitter();

    @HostListener('document:click', ['$event']) onClick(event: any) {
        log.debug('ClickOutsideDirective: onClick(): event.target:', event.target);
        let targetElement: Element = event.target;
        let classList = targetElement.classList;
        log.debug('ClickOutsideDirective: onClick(): classList:', classList);
        let clickedInside = false;

        // log.debug('ClickOutsideDirective: onClick(): getElementsByClassName:', targetElement.getElementsByClassName('routerIcon'));
        if (classList.contains('routerIcon')) {
            clickedInside = true;
        }

        // const clickedInside = this.el.nativeElement.contains(targetElement);
        log.debug('ClickOutsideDirective: onClick(): el:', this.el.nativeElement);
        log.debug('ClickOutsideDirective: onClick(): clickedInside:', clickedInside);

        if (!clickedInside) {
            this.clickOutside.emit();
        }
    }

}

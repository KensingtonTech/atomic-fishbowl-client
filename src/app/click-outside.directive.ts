import {Directive, ElementRef, Output, EventEmitter, HostListener} from '@angular/core';
import * as log from 'loglevel';

@Directive({
    // tslint:disable-next-line:directive-selector
    selector: '[clickOutside]'
})
export class ClickOutsideDirective {
    constructor(private el: ElementRef ) {}

    @Output() public clickOutside = new EventEmitter();


    @HostListener('document:click', ['$event']) public onClick(event: any) {
      let targetElement = event.target;
        const clickedInside = this.el.nativeElement.contains(targetElement);
        if (!clickedInside) {
            this.clickOutside.emit(null);
        }
    }
}

import {Directive, ElementRef, Output, EventEmitter, HostListener} from '@angular/core';
declare var log;

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

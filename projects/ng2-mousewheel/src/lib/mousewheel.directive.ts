import { Directive, ElementRef, Output, EventEmitter, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import '@kensingtontech/hamsterjs';

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[kwheel]'
})

export class Ng2MousewheelDirective implements AfterViewInit, OnDestroy {

  constructor( private el: ElementRef,
               private ngZone: NgZone ) {}

  @Output() kwheel: EventEmitter<any> = new EventEmitter();
  private hamster: Hamster;

  ngAfterViewInit(): void {
    // log.debug('KMousewheelDirective: ngAfterViewInit(): Binding mouse wheel');

    // bind Hamster wheel event
    this.ngZone.runOutsideAngular( () => {
      this.hamster = Hamster(this.el.nativeElement, true);
      this.hamster.wheel( (event: any, delta: any, deltaX: any, deltaY: any) => this.mouseWheelFunc(event, delta, deltaX, deltaY) );
    });

  }

  ngOnDestroy(): void {
    // log.debug('KMousewheelDirective: ngOnDestroy(): Unbinding mouse wheel');

    // Unbind Hamster wheel event
    this.hamster.unwheel();
  }

  mouseWheelFunc(event: any, delta: any, deltaX: any, deltaY: any): void {
    this.kwheel.emit( { 'event': event, 'delta': delta, 'deltaX': deltaX, 'deltaY': deltaY } );
  }

}

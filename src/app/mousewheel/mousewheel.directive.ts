import { Directive, ElementRef, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
declare var Hamster: any;
import * as log from 'loglevel';

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[kwheel]'
})

export class KMousewheelDirective implements AfterViewInit, OnInit, OnDestroy {

  constructor( private elRef: ElementRef,
               private ngZone: NgZone ) {}

  @Output() kwheel: EventEmitter<any> = new EventEmitter();
  private hamster: any;

  ngOnInit(): void {
    log.debug('KMousewheelDirective: ngOnInit(): Creating new HamsterJS instance');
    this.hamster = this.ngZone.runOutsideAngular( () => Hamster(this.elRef.nativeElement) );
  }

  ngAfterViewInit(): void {
    log.debug('KMousewheelDirective: ngAfterViewInit(): Binding mouse wheel');
    // bind Hamster wheel event
    this.hamster.wheel( (event: any, delta: any, deltaX: any, deltaY: any) => this.mouseWheelFunc(event, delta, deltaX, deltaY) );

/*    this.ngZone.runOutsideAngular( () => {
      const nativeElement = this.elRef.nativeElement;
      //nativeElement.addEventListener(this.event, this._handler, false);
      this.hamster = Hamster(this.elRef.nativeElement); //new method of creating hamster object
      this.hamster.wheel( (event: any, delta: any, deltaX: any, deltaY: any) => this.mouseWheelFunc(event, delta, deltaX, deltaY) ); //new method
    });
*/
  }

  ngOnDestroy(): void {
    // Unbind Hamster wheel event
    log.debug('KMousewheelDirective: ngOnDestroy(): Unbinding mouse wheel');
    this.hamster.unwheel();
  }

  mouseWheelFunc(event: any, delta: any, deltaX: any, deltaY: any): void {
    this.kwheel.emit( { 'event': event, 'delta': delta, 'deltaX': deltaX, 'deltaY': deltaY } );
  }

}

import { Directive, ElementRef, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
declare var Hamster: any;
declare var log: any;

@Directive({
  selector: '[kwheel]'
})

export class KMousewheel implements AfterViewInit, OnInit, OnDestroy {

  constructor( private elRef: ElementRef, private _ngZone: NgZone ) { }

  @Output() kwheel: EventEmitter<Object> = new EventEmitter();
  private hamster: any;

  mouseWheelFunc(event: any, delta: any, deltaX: any, deltaY: any): any {
    this.kwheel.emit( { 'event': event, 'delta': delta, 'deltaX': deltaX, 'deltaY': deltaY } );
  }

  ngOnInit(): void {
    //console.log("creating new hamster");
    this.hamster = Hamster(this.elRef.nativeElement); //new method of creating hamster object
  }

  ngAfterViewInit(): void {
    // bind Hamster wheel event
    this.hamster.wheel( (event: any, delta: any, deltaX: any, deltaY: any) => this.mouseWheelFunc(event, delta, deltaX, deltaY) ); //new method

/*    this._ngZone.runOutsideAngular( () => {
      const nativeElement = this.elRef.nativeElement;
      //nativeElement.addEventListener(this.event, this._handler, false);
      this.hamster = Hamster(this.elRef.nativeElement); //new method of creating hamster object
      this.hamster.wheel( (event: any, delta: any, deltaX: any, deltaY: any) => this.mouseWheelFunc(event, delta, deltaX, deltaY) ); //new method
    });
*/
  }

  ngOnDestroy() {
    // unbind Hamster wheel event
    //this.hamster.unwheel( () => this.mouseWheelFunc);
  }

}

import { Directive, OnInit, OnChanges, Input, Output, ElementRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, Renderer2, ViewEncapsulation } from '@angular/core';
import { IsotopeOptions } from './isotope-options';
import { ToolService } from '../tool.service';
declare var log;
declare var $: any;
declare var Isotope;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[isotope], isotope'
})

export class IsotopeDirective implements OnInit, OnChanges {

  constructor(  public el: ElementRef,
                private toolService: ToolService,
                private ngZone: NgZone,
                private renderer: Renderer2 ) {}


  @Input() public options: IsotopeOptions;
  @Input() public filter = '*';
  public isotope: any;
  private isDestroyed = false;
  private removeTimer: any;



  ngOnInit() {
    log.debug('IsotopeDirective: ngOnInit()');

    // Create jquery case-insensitive '::Contains' selector (as opposed to cases-sensitive '::contains')
    // To potentially be used in filtering
    $['expr'][':'].Contains = $['expr'].createPseudo(function(arg) {
      return function( elem ) {
          return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
      };
    });

    // Create isotope options object
    // Set default itemSelector
    if (!this.options.itemSelector) {
      this.options.itemSelector = '[isotope-brick], isotope-brick';
    }
    // log.debug('IsotopeDirective: ngOnInit(): options:', this.options);

    // Initialize Isotope
    // this.ngZone.runOutsideAngular( () => this.isotope = new Isotope(this.el.nativeElement, this.options) );
    this.isotope = new Isotope(this.el.nativeElement, this.options);

    // Perform actions on layoutComplete event
    this.ngZone.runOutsideAngular( () => {
      this.isotope.on( 'layoutComplete', this.onLayoutComplete );
    });
  }



  private onLayoutComplete = () => {
    this.toolService.layoutComplete.next(this.isotope.modes.masonry.maxY); // send the height of the container
  }



  ngOnChanges(values: any): void {
    // log.debug('IsotopeDirective: ngOnChanges()', e);

    if ('options' in values && this.isotope !== undefined ) {
      log.debug('IsotopeDirective: ngOnChanges(): arranging');
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
    }

    else if ('filter' in values && this.isotope !== undefined) {
      log.debug('IsotopeDirective: ngOnChanges(): this.filter:', this.filter);
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( { filter: this.filter } ) );
    }

  }



  public destroyMe(): void {
    // this is used because onDestroy() is called after the bricks get removed.  We want to enhance performance by not allowing all the isotope remove operations to take place, and instead just destroy Isotope altogether.
    log.debug('IsotopeDirective: destroyMe():  Manually destroying isotope');
    if (this.isotope) {
      this.ngZone.runOutsideAngular( () => { this.isotope.off( 'layoutComplete', this.onLayoutComplete ); } );
      this.isotope = null;
      this.isDestroyed = true;
    }
  }



  public layout() {
    log.debug('IsotopeDirective: layout()');

    if (this.isotope === undefined) {
      return;
    }

    if (this.filter) {
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( {filter: this.filter} ) );
    }

    else if (this.options) {
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
    }

    else {
      this.ngZone.runOutsideAngular( () => this.isotope.arrange() );
    }

  }



  public add(element: ElementRef) {
    // log.debug('IsotopeDirective: add()');

    this.ngZone.runOutsideAngular( () => {

      // this will only layout the new item
      this.isotope.appended(element.nativeElement);

      // tiles aren't displayed initially so that un-layed-out tiles won't pollute the view.  Now that they're layed out, we can un-hide them
      this.renderer.setStyle(this.el.nativeElement, 'display', 'block');
    } );

  }



  public remove(element: ElementRef) {
    // log.debug('IsotopeDirective: remove()');

    // Tell Isotope that a child brick has been removed
    if (!this.isDestroyed ) {

      if (this.removeTimer) {
        clearTimeout(this.removeTimer); // cancel existing layout() call so a new one can run
      }

      log.debug('IsotopeDirective: remove(): removing brick');
      this.ngZone.runOutsideAngular( () => this.isotope.remove(element.nativeElement)); // tell isotope that the brick has been removed

      // Layout bricks
      // we use a timer so that if many elements are being removed at once (due to a purge), layout will only be called once.
      this.removeTimer = setTimeout( () => this.layout(), 10 );

    }

  }

}

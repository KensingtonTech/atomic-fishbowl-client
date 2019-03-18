import { Directive, OnInit, OnChanges, Input, ElementRef, NgZone, Renderer2, OnDestroy } from '@angular/core';
import { IsotopeConfig } from './isotope-config';
import { IsotopeAPI } from './isotope-api';
import { Logger } from 'loglevel';
declare var log: Logger;
declare var $: any;
// import * as Isotope from 'isotope-layout'; // we're not using typescript / webpack loading as doing so breaks layout on prod.  We instead use a <script> tag in index.html to load it from resources
declare var Isotope;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[isotope], isotope'
})

export class IsotopeDirective implements OnInit, OnChanges, OnDestroy {

  constructor(  public el: ElementRef,
                private ngZone: NgZone,
                private renderer: Renderer2 ) {}


  @Input() public config: IsotopeConfig;
  @Input() public filter = '*';
  private api: IsotopeAPI;
  public isotope: any = null;
  private isDestroyed = false;
  private removeTimer: any = null;



  ngOnInit() {
    log.debug('IsotopeDirective: ngOnInit()');

    // Create jquery case-insensitive '::Contains' selector (as opposed to cases-sensitive '::contains')
    // To potentially be used in filtering
    $['expr'][':'].Contains = $['expr'].createPseudo(function(arg) {
      return function( elem ) {
          return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
      };
    });

    // create public API
    this.api = {
      layout: this.layout.bind(this),
      destroyMe: this.destroyMe.bind(this)
    };
    this.config.api.next(this.api);

    // Create isotope isotopeConfig object
    // Set default itemSelector
    if (!this.config.itemSelector) {
      this.config.itemSelector = '[isotope-brick], isotope-brick';
    }
    // log.debug('IsotopeDirective: ngOnInit(): config:', this.config);

    // Initialize Isotope
    // this.ngZone.runOutsideAngular( () => this.isotope = new Isotope(this.el.nativeElement, <Isotope.IsotopeOptions><unknown>this.config) );
    this.ngZone.runOutsideAngular( () => this.isotope = new Isotope(this.el.nativeElement, this.config) );
    // this.isotope = new Isotope(this.el.nativeElement, this.config);

    // Perform actions on layoutComplete event
    this.ngZone.runOutsideAngular( () => {
      this.isotope.on( 'layoutComplete', this.onLayoutComplete );
    });

    this.config.initialized.next(true);
  }



  ngOnDestroy() {
    this.config.initialized.next(false);
  }



  private onLayoutComplete = () => {
    this.config.layoutComplete.next(this.isotope.modes.masonry.maxY); // send the height of the container
  }



  ngOnChanges(values: any): void {
    // log.debug('IsotopeDirective: ngOnChanges()', e);

    if ('config' in values && this.isotope) {
      log.debug('IsotopeDirective: ngOnChanges(): got new config.  arranging');
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.config ) );
    }

    else if ('filter' in values && this.isotope) {
      log.debug('IsotopeDirective: ngOnChanges(): this.filter:', this.filter);
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( { filter: this.filter } ) );
    }

  }



  public destroyMe(): void {
    // this is used because onDestroy() is called after the bricks get removed.  We want to enhance performance by not allowing all the isotope remove operations to take place, and instead just destroy Isotope altogether.
    log.debug('IsotopeDirective: destroyMe():  Killing Isotope');
    if (this.isotope) {
      this.ngZone.runOutsideAngular( () => { this.isotope.off( 'layoutComplete', this.onLayoutComplete ); } );
      this.isotope = null;
      this.isDestroyed = true;
    }
  }



  public layout() {
    log.debug('IsotopeDirective: layout()');

    if (!this.isotope) {
      return;
    }

    if (this.filter) {
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( {filter: this.filter} ) );
    }

    else if (this.config) {
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.config ) );
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

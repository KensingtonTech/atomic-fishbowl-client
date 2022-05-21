import {
  Directive,
  OnInit,
  OnChanges,
  Input,
  ElementRef,
  NgZone,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { IsotopeConfig } from './isotope-config';
import { IsotopeAPI } from './isotope-api';
import * as log from 'loglevel';
import * as utils from '../utils';
// Isotope typedefs are hopelessly broken
// we're not using typescript / webpack loading as doing so breaks layout when using aot compilation.  We instead use a <script> tag in index.html to load it from /resources.  it sucks but until aot is fixed, we must load it this way
declare let Isotope: any;

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[isotope], isotope'
})

export class IsotopeDirective implements OnInit, OnChanges, OnDestroy {

  constructor(
    public el: ElementRef,
    private ngZone: NgZone
  ) {}


  @Input() config: IsotopeConfig;
  @Input() filter = '*';
  @Input() addWithLayout = false; // controls whether layout will be called when adding items.  layout must be invoked manually at the end if true
  @Input() layoutCompleteCallback?: (containerHeight: number) => void;
  private api: IsotopeAPI = {
    layout: this.layout.bind(this),
    destroyMe: this.destroyMe.bind(this),
    initializeMe: this.initializeMe.bind(this),
    unhideAll: this.unhideAll.bind(this),
    basicLayout: this.basicLayout.bind(this),
    reloadItems: this.reloadItems.bind(this)
  };
  isotope: any;
  private isDestroyed = false;
  private removeTimer?: NodeJS.Timeout;




  ngOnInit(): void {
    log.debug('IsotopeDirective: ngOnInit()');
    this.config.api.next(this.api);

    // Create isotope isotopeConfig object
    // Set default itemSelector
    if (!this.config.itemSelector) {
      this.config.itemSelector = '[isotope-brick], isotope-brick';
    }
    this.initializeMe(); // auto-initialize
  }



  ngOnDestroy(): void {
    this.config.initialized.next(false);
  }



  private onLayoutComplete = () => {
    // this.config.layoutComplete.next(this.isotope.modes.masonry.maxY); // send the height of the container
    if (this.layoutCompleteCallback) {
      this.layoutCompleteCallback(this.isotope.modes.masonry.maxY);
    }
  };



  ngOnChanges(values: SimpleChanges): void {
    if (utils.firstOrChangedSimpleChange('config', values) && this.isotope) {
      this.ngZone.runOutsideAngular(
        () => this.isotope.arrange( this.config )
      );
    }

    else if (utils.firstOrChangedSimpleChange('filter', values) && this.isotope) {
      // log.debug('IsotopeDirective: ngOnChanges(): this.filter:', this.filter);
      this.ngZone.runOutsideAngular(
        () => this.isotope.arrange( { filter: this.filter } )
      );
    }
  }



  initializeMe(): void {
    // Initialize Isotope
    if (this.isotope) {
      log.error('IsotopeDirective: initializeMe(): isotope is already initialized');
      return;
    }
    this.ngZone.runOutsideAngular(
      () => this.isotope = new Isotope(this.el.nativeElement, this.config)
    );
    this.isDestroyed = false;

    // Perform actions on layoutComplete event
    this.ngZone.runOutsideAngular( () => {
      this.isotope.on( 'layoutComplete', this.onLayoutComplete );
    });
    this.config.initialized.next(true);
  }



  destroyMe(): void {
    // this is used because onDestroy() is called after the bricks get removed.  We want to enhance performance by not allowing all the isotope remove operations to take place, and instead just destroy Isotope altogether.
    log.debug('IsotopeDirective: destroyMe():  Killing Isotope');
    if (this.isotope) {
      this.ngZone.runOutsideAngular(
        () => this.isotope.off( 'layoutComplete', this.onLayoutComplete )
      );
      this.isotope = undefined;
      this.isDestroyed = true;
      this.config.initialized.next(false);
    }
  }



  layout(refreshConfig = false) {
    log.debug('IsotopeDirective: layout()');

    if (!this.isotope) {
      return;
    }

    if (refreshConfig) {
      this.ngZone.runOutsideAngular(
        () => this.isotope.arrange( this.config )
      );
      return;
    }

    if (this.filter) {
      this.ngZone.runOutsideAngular(
        () => this.isotope.arrange( {filter: this.filter} )
      );
    }

    else if (this.config) {
      this.ngZone.runOutsideAngular(
        () => this.isotope.arrange( this.config )
      );
    }

    else {
      this.ngZone.runOutsideAngular(
        () => this.isotope.arrange()
      );
    }
  }



  basicLayout() {
    // log.debug('IsotopeDirective: basicLayout()');
    if (!this.isotope) {
      return;
    }
    this.isotope.layout();
  }



  reloadItems() {
    // log.debug('IsotopeDirective: reloadItems()');
    if (!this.isotope) {
      return;
    }
    this.isotope.reloadItems();
  }



  unhideAll() {
    for (const element of this.el.nativeElement.children) {
      element.style.visibility = 'visible';
    }
  }



  addBrick(element: ElementRef) {
    log.debug('IsotopeDirective: addBrick()');
    this.ngZone.runOutsideAngular( () => {

      if (this.addWithLayout) {
        log.debug('IsotopeDirective: addBrick(): adding brick with layout');
        this.isotope.appended(element.nativeElement); // this will only layout the new item

        // tiles aren't displayed initially so that un-layed-out tiles won't pollute the view.  Now that they're layed out, we can un-hide them
        element.nativeElement.style.visibility = 'visible';
      }
      else {
        log.debug('IsotopeDirective: addBrick(): adding brick without layout');
        this.isotope.addItems( element.nativeElement );
      }
    } );

  }



  remove(element: ElementRef) {
    // log.debug('IsotopeDirective: remove()');
    // Tell Isotope that a child brick has been removed
    if (!this.isDestroyed ) {

      if (this.removeTimer) {
        clearTimeout(this.removeTimer); // cancel existing layout() call so a new one can run
      }

      this.ngZone.runOutsideAngular( () => this.isotope.remove(element.nativeElement)); // tell isotope that the brick has been removed

      // Layout bricks
      // we use a timer so that if many elements are being removed at once (due to a purge), layout will only be called once.
      this.removeTimer = this.ngZone.runOutsideAngular(
        () => setTimeout(
          () => this.layout(),
          10
        )
      );
    }

  }

}

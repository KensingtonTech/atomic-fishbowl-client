import { Directive, OnInit, OnDestroy, OnChanges, AfterContentInit, Input, Output, ElementRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, Renderer2, ViewEncapsulation } from '@angular/core';
import { MasonryOptions } from './masonry-options';
import { ToolService } from '../tool.service';
import { Subscription } from 'rxjs/Subscription';
import * as log from 'loglevel';
import * as imagesLoaded from 'imagesloaded';
declare var Isotope;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[masonry], masonry'
})

export class MasonryDirective implements OnInit, OnChanges, OnDestroy, AfterContentInit {

  constructor(  public el: ElementRef,
                private toolService: ToolService,
                private ngZone: NgZone,
                private renderer: Renderer2 ) {}


  @Input() public options: MasonryOptions;
  @Input() public filter = '*';
  @Input() public loadAllBeforeLayout: boolean;
  private isFirstItem = true;
  public isotope: any;
  private isDestroyed = false;
  private removeTimer: any;
  private elementsToAppend = document.createDocumentFragment();
  private refreshMasonryLayoutSubscription: Subscription;
  private imageLoad: any;
  private imagesLoadedRunning = false;



  ngOnInit() {
    log.debug('MasonryDirective: ngOnInit()');

    this.refreshMasonryLayoutSubscription = this.toolService.refreshMasonryLayout.subscribe( () => {
      this.layout();
    });

    // Create jquery case-insensitive '::Contains' selector (as opposed to cases-sensitive '::contains')
    // To potentially be used in filtering
    $['expr'][':'].Contains = $['expr'].createPseudo(function(arg) {
      return function( elem ) {
          return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
      };
    });

    // Create masonry options object
    // Set default itemSelector
    if (!this.options.itemSelector) {
      this.options.itemSelector = '[masonry-brick], masonry-brick';
    }
    // log.debug('MasonryDirective: ngOnInit(): options:', this.options);

    // Set element display to block
    if (this.el.nativeElement.tagName === 'MASONRY') {
      this.el.nativeElement.style.display = 'block';
    }

    // Initialize Masonry
    this.ngZone.runOutsideAngular( () => this.isotope = new Isotope(this.el.nativeElement, this.options) );

    // Perform actions on layoutComplete event
    this.ngZone.runOutsideAngular( () => {
      this.isotope.on( 'layoutComplete', this.onLayoutComplete );
    });
  }

  private onLayoutComplete = () => {
    log.debug(this.isotope);
    this.toolService.layoutComplete.next();
  }



  ngAfterContentInit(): void {
    log.debug('MasonryDirective: ngAfterContentInit()');

    if (this.loadAllBeforeLayout) {

      // hide all the elements until they've been loaded...
      // after which we'll show them and immediately let isotope lay them out
      this.renderer.setStyle(this.el.nativeElement, 'visibility', 'hidden');
      // setTimeout( () => this.renderer.appendChild(this.el.nativeElement, this.elementsToAppend), 0);
      // this.renderer.appendChild(this.el.nativeElement, this.elementsToAppend);

      // this.imageLoad = imagesLoaded('.grid', this.onImagesLoadedComplete );
      this.ngZone.runOutsideAngular( () => {
        this.renderer.appendChild(this.el.nativeElement, this.elementsToAppend);
        this.imageLoad = imagesLoaded('.grid', this.onImagesLoadedComplete );
        this.imagesLoadedRunning = true;
      } );
    }
  }



  ngOnChanges(values: any): void {
    // log.debug("MasonryDirective: ngOnChanges()", e);

    if ('options' in values && this.isotope !== undefined ) {
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
    }

    else if ('filter' in values && this.isotope !== undefined) {
      log.debug('MasonryDirective: ngOnChanges(): this.filter:', this.filter);
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( { filter: this.filter } ) );
    }

    if ('loadAllBeforeLayout' in values && !values.loadAllBeforeLayout.firstChange && values.loadAllBeforeLayout.currentValue !== values.loadAllBeforeLayout.previousValue) {
      // loadAllBeforeLayout changed on us
      // disable imagesLoaded.  the rest will be taken care of in add()
      log.debug('MasonryDirective: ngOnChanges(): disabling imagesLoaded');
      if (!this.imagesLoadedRunning) {
        this.imageLoad.off('.grid', this.onImagesLoadedComplete);
      }
    }

  }



  private onImagesLoadedComplete = (instance: any) => {
    log.debug('MasonryDirective: onImagesLoadedComplete(): All images have been loaded');

    this.imagesLoadedRunning = false;

    let elements = document.querySelectorAll('.imagesLoadedBrick');

    // un-hide all of the bricks
    this.renderer.setStyle(this.el.nativeElement, 'visibility', 'visible');

    // now lay them out
    this.isotope.insert(elements);

    this.imageLoad.off('.grid', this.onImagesLoadedComplete);
    // this.changeDetectionRef.markForCheck();
  }



  ngOnDestroy(): void {
    log.debug('MasonryDirective: ngOnDestroy().  Automatically destroying MasonryDirective'); // just informational so we know when parent has destroyed this
    this.refreshMasonryLayoutSubscription.unsubscribe();
  }



  public destroyMe(): void {
    log.debug('MasonryDirective: destroyMe():  Manually destroying isotope');
    if (this.isotope) {
      this.ngZone.runOutsideAngular( () => { this.isotope.off( 'layoutComplete', this.onLayoutComplete ); } );
      this.isotope = null;
      // Remove all child bricks
      while (this.el.nativeElement.hasChildNodes()) {
        this.el.nativeElement.removeChild(this.el.nativeElement.lastChild);
      }
      this.isDestroyed = true;
    }
  }



  public layout() {
    log.debug('MasonryDirective: layout()');
    // this.changeDetectionRef.detectChanges();

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
    // this.changeDetectionRef.markForCheck();
  }



  public add(element: ElementRef) {

        if (this.loadAllBeforeLayout) {
          // Complete fixed collections
          // Let all images load before calling layout (done with imagesLoaded run from ngAfterContentInit)
          log.debug('MasonryDirective: add(): Adding element without layout (complete fixed collections)');

          element.nativeElement.classList.add('imagesLoadedBrick');
          this.elementsToAppend.appendChild(element.nativeElement);

          if (this.isFirstItem) {
            this.isFirstItem = false;
            // we need this here in case we have to switch loadAllBefore layout modes in the mid-collection.
          }
        }


        if (!this.loadAllBeforeLayout) {
          // Rolling / monitoring / still-building-fixed collections
          // We will append each image to the view, only calling layout after each item has loaded (using imagesLoaded())
          log.debug('MasonryDirective: add(): Appending element with layout (rolling/monitoring/still-building-fixed collections)');

          // Run layout() if first item
          // This is necessary to prevent isotope.appended() (which is really isotope.layoutItems()) from throwing an error
          // It needs to already have a layout before it can calculate the layout of only a new item
          if (this.isFirstItem) {
            // this.layout();
            this.isFirstItem = false;
          }

          element.nativeElement.style.display = 'none';
          // this.ngZone.runOutsideAngular( () => setTimeout( () => this.renderer.appendChild(this.el.nativeElement, element.nativeElement), 0) );
          // this.ngZone.runOutsideAngular( () => this.renderer.appendChild(this.el.nativeElement, element.nativeElement) );
          this.renderer.appendChild(this.el.nativeElement, element.nativeElement);

          let addFunc = (instance: any) => {
            // Tell Isotope that a child brick has been added

            // add brick to DOM
            this.renderer.setStyle(this.el.nativeElement, 'display', 'block');

            if (this.isotope) {
              this.ngZone.runOutsideAngular( () => this.isotope.appended(element.nativeElement) ); // this will only layout the new item
            }
            imgLoad.off( 'progress', addFunc);
          };

          // let imgLoad = imagesLoaded(element.nativeElement);
          let imgLoad = null;
          this.ngZone.runOutsideAngular( () => imgLoad = imagesLoaded(element.nativeElement) );
          // imgLoad.on( 'progress', addFunc );
          this.ngZone.runOutsideAngular( () => imgLoad.on( 'progress', addFunc ) );
        }
      }



  public remove(element: ElementRef) {
    log.debug('MasonryDirective: remove()');

    // Tell Isotope that a child brick has been removed
    if (!this.isDestroyed ) {

      if (this.removeTimer) {
        clearTimeout(this.removeTimer); // cancel existing layout() call so a new one can run
      }
      // setTimeout( () => this.renderer.removeChild(this.el.nativeElement, element.nativeElement), 0);
      this.ngZone.runOutsideAngular( () => this.renderer.removeChild(this.el.nativeElement, element.nativeElement) );

      // log.debug('MasonryDirective: remove(): removing brick:', element);
      log.debug('MasonryDirective: remove(): removing brick');
      this.ngZone.runOutsideAngular( () => this.isotope.remove(element.nativeElement)); // tell isotope that the brick has been removed

      // Layout bricks
      this.removeTimer = setTimeout( () => this.layout(), 10 );
    }
    else {
      // log.debug('MasonryDirective: remove(): removing child:', element);
      log.debug('MasonryDirective: remove(): removing child');
      // this.renderer.removeChild(this.el.nativeElement, element.nativeElement);
      // setTimeout( () => this.renderer.removeChild(this.el.nativeElement, element.nativeElement), 0);
      // this.ngZone.runOutsideAngular( () => setTimeout( () => this.renderer.removeChild(this.el.nativeElement, element.nativeElement), 0) );
      this.ngZone.runOutsideAngular( () => this.renderer.removeChild(this.el.nativeElement, element.nativeElement) );
    }
  }

}

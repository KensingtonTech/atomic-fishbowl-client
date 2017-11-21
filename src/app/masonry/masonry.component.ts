import { Component, OnInit, OnDestroy, OnChanges, AfterContentInit, Input, Output, ElementRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, Renderer2, ViewEncapsulation } from '@angular/core';
import { MasonryOptions } from './masonry-options';
import { ToolService } from '../tool.service';
import { Subscription } from 'rxjs/Subscription';
import * as log from 'loglevel';
import * as imagesLoaded from 'imagesloaded';
// import * as Isotope from 'isotope-layout'; // import error for now
// import { Isotope } from 'isotope-layout';
// import 'isotope-layout';
declare var Isotope;

@Component({
  selector: '[masonry], masonry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // encapsulation: ViewEncapsulation.None,
  template: ''
})

export class MasonryComponent implements OnInit, OnChanges, OnDestroy, AfterContentInit {

  constructor(  public el: ElementRef,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService,
                private ngZone: NgZone,
                private renderer: Renderer2 ) {}


  @Input() public options: MasonryOptions;
  @Input() public filter = '*';
  @Input() public loadAllBeforeLayout: boolean;
  private isFirstItem = true;
  public isotope: any;
  private isDestroyed = false;
  private addTimer: any;
  private removeTimer: any;
  private elementsToAppend = document.createDocumentFragment();
  private refreshMasonryLayoutSubscription: Subscription;

  ngOnInit() {
    log.debug('MasonryComponent: ngOnInit()');

    /*if (this.loadAllBeforeLayout) {
      log.debug('setting');
      this.renderer.setProperty(this.el.nativeElement, 'visibility', 'hidden');
    }*/

    this.refreshMasonryLayoutSubscription = this.toolService.refreshMasonryLayout.subscribe( () => {
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
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

    // Set element display to block
    if (this.el.nativeElement.tagName === 'MASONRY') {
      this.el.nativeElement.style.display = 'block';
    }

    // Initialize Masonry
    // log.debug('MasonryComponent: ngOnInit(): options:', this.options);
    // this.isotope = new masonry('.grid', this.options);
    // this.isotope = new Isotope(this.el.nativeElement, this.options);
    this.ngZone.runOutsideAngular( () => this.isotope = new Isotope(this.el.nativeElement, this.options) );

    // Perform actions on layoutComplete event
    this.ngZone.runOutsideAngular( () => {
      this.isotope.on( 'layoutComplete', () => {
        // this.changeDetectionRef.detectChanges();
        // this.changeDetectionRef.markForCheck();
        this.toolService.layoutComplete.next();
      });
    });
  }


  ngOnChanges(e: any): void {
    // log.debug("MasonryComponent: ngOnChanges()", e);

    if ('options' in e && this.isotope !== undefined ) {
      // log.debug("MasonryComponent: ngOnChanges() Got options", e.options.currentValue);
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
    }

    else if ('filter' in e && this.isotope !== undefined) {
      log.debug('MasonryComponent: ngOnChanges(): this.filter:', this.filter);
      this.ngZone.runOutsideAngular( () => this.isotope.arrange( {filter: this.filter} ) );
    }

  }

  ngOnDestroy(): void {
    log.debug('MasonryComponent: ngOnDestroy().  Automatically destroying MasonryComponent'); // just informational so we know when parent has destroyed this
    this.refreshMasonryLayoutSubscription.unsubscribe();
  }

  public destroyMe(): void {
    log.debug('MasonryComponent: destroyMe():  Manually destroying isotope');
    if (this.isotope) {
      this.ngZone.runOutsideAngular( () => { this.isotope.off( 'layoutComplete', () => this.toolService.layoutComplete.next() ); } );
      // this.ngZone.runOutsideAngular( () => this.isotope.destroy() );
      this.isotope = undefined;
      // Remove all child bricks
      while (this.el.nativeElement.hasChildNodes()) {
        this.el.nativeElement.removeChild(this.el.nativeElement.lastChild);
      }
      this.isDestroyed = true;
    }
  }

  ngAfterContentInit(): void {
    log.debug('MasonryComponent: ngAfterContentInit()');
    if (this.loadAllBeforeLayout) {
      this.renderer.setStyle(this.el.nativeElement, 'visibility', 'hidden');
      this.renderer.appendChild(this.el.nativeElement, this.elementsToAppend);
      imagesLoaded('.grid', (instance: any) => {
        log.debug('MasonryComponent: ngAfterContentInit(): All images have been loaded');
        let elements = document.querySelectorAll('.brick');
        this.renderer.setStyle(this.el.nativeElement, 'visibility', 'visible');
        // this.ngZone.runOutsideAngular( () => this.isotope.addItems(elements) );
        // this.layout();
        // this.ngZone.runOutsideAngular( () => this.isotope.insert(elements) );
        this.isotope.insert(elements);
        this.changeDetectionRef.markForCheck();
      });
    }
  }



  public layout() {
    log.debug('MasonryComponent: layout()');
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
    this.changeDetectionRef.markForCheck();
  }

  /*
  public layoutItems(item: any) {
    log.debug('MasonryComponent: layoutItems()');
    if (this.isotope === undefined) {
      return;
    }
    let el: any = this.isotope.getItems(item);
    this.isotope.layoutItems( el );
    this.changeDetectionRef.markForCheck();
  }
*/

  // public add(element: HTMLElement) {
  public addOld(element: ElementRef) {

    if (this.loadAllBeforeLayout) {
      // Complete fixed collections
      // Let all images load before calling layout (done with imagesLoaded run from ngAfterContentInit)
      log.debug('MasonryComponent: add(): Adding element without layout (complete fixed collections)');

      // this.el.nativeElement.appendChild(element);
      this.renderer.appendChild(this.el.nativeElement, element.nativeElement);
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();

      // this.ngZone.runOutsideAngular( () => this.isotope.addItems(element) );
      this.ngZone.runOutsideAngular( () => this.isotope.addItems(element.nativeElement) );
    }


    if (!this.loadAllBeforeLayout) {
      // Rolling / monitoring / still-building-fixed collections
      // We will append each image to the view, only calling layout after each item has loaded (using imagesLoaded())
      log.debug('MasonryComponent: add(): Appending element with layout (rolling/monitoring/still-building-fixed collections)');

      // Run layout() if first item
      // This is necessary to prevent isotope.appended() (which is really isotope.layoutItems()) from throwing an error
      // It needs to already have a layout before it can calculate the layout of only a new item
      if (this.isFirstItem) {
        this.layout();
        this.isFirstItem = false;
      }

      imagesLoaded(element.nativeElement, (instance: any) => {
        // Tell Isotope that a child brick has been added

        // this.ngZone.runOutsideAngular( () => this.isotope.insert(element) ); // lays out all items - cpu monster

        // this.el.nativeElement.appendChild(element); // add brick to DOM
        this.renderer.appendChild(this.el.nativeElement, element.nativeElement);
        // this.changeDetectionRef.detectChanges();
        // this.changeDetectionRef.markForCheck();
        // this.ngZone.runOutsideAngular( () => this.isotope.addItems(element)); // adds to isotope instance but doesn't layout
        // this.layoutItems(element);

        this.ngZone.runOutsideAngular( () => this.isotope.appended(element.nativeElement) ); // this will only layout the new item
        // this.ngZone.runOutsideAngular( () => this.isotope.prepended(element) );
      });
    }
  }

  public add(element: ElementRef) {

        if (this.loadAllBeforeLayout) {
          // Complete fixed collections
          // Let all images load before calling layout (done with imagesLoaded run from ngAfterContentInit)
          log.debug('MasonryComponent: add(): Adding element without layout (complete fixed collections)');

          // element.nativeElement.style.display = 'none';
          // element.nativeElement.style.visibility = 'hidden';

          // this.renderer.appendChild(this.el.nativeElement, element.nativeElement);
          this.elementsToAppend.appendChild(element.nativeElement);
          // this.ngZone.runOutsideAngular( () => this.isotope.addItems(element.nativeElement) );
        }


        if (!this.loadAllBeforeLayout) {
          // Rolling / monitoring / still-building-fixed collections
          // We will append each image to the view, only calling layout after each item has loaded (using imagesLoaded())
          log.debug('MasonryComponent: add(): Appending element with layout (rolling/monitoring/still-building-fixed collections)');

          // Run layout() if first item
          // This is necessary to prevent isotope.appended() (which is really isotope.layoutItems()) from throwing an error
          // It needs to already have a layout before it can calculate the layout of only a new item
          if (this.isFirstItem) {
            this.layout();
            this.isFirstItem = false;
          }

          element.nativeElement.style.display = 'none';
          this.renderer.appendChild(this.el.nativeElement, element.nativeElement);

          let addFunc = (instance: any) => {
            // Tell Isotope that a child brick has been added

            // add brick to DOM
            // element.nativeElement.style.display = 'block';
            this.renderer.setStyle(this.el.nativeElement, 'display', 'block');

            this.ngZone.runOutsideAngular( () => this.isotope.appended(element.nativeElement) ); // this will only layout the new item
            imgLoad.off( 'progress', addFunc);
          };

          let imgLoad = imagesLoaded(element.nativeElement);
          imgLoad.on( 'progress', addFunc );
        }
      }


  // public remove(element: HTMLElement) {
  public remove(element: ElementRef) {
    log.debug('MasonryComponent: remove()');

    // Tell Isotope that a child brick has been removed
    if (!this.isDestroyed ) {
      if (this.removeTimer !== undefined) {
        clearTimeout(this.removeTimer); // cancel existing layout() call so a new one can run
      }
      this.renderer.removeChild(this.el.nativeElement, element.nativeElement);
      // log.debug('MasonryComponent: remove(): removing brick:', element);
      log.debug('MasonryComponent: remove(): removing brick:', element);
      // this.ngZone.runOutsideAngular( () => this.isotope.remove(element)); // tell isotope that the brick has been removed
      this.ngZone.runOutsideAngular( () => this.isotope.remove(element.nativeElement)); // tell isotope that the brick has been removed
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
      // Layout bricks
      this.removeTimer = setTimeout( () => this.layout(), 10 );
    }
  }

}

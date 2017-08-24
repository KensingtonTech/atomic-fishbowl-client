import { Component, OnInit, OnDestroy, OnChanges, AfterContentInit, Input, Output, ElementRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { MasonryOptions } from './masonry-options';
import { ToolService } from '../tool.service';
declare var log: any;
declare var imagesLoaded: any;
declare var Isotope;
// tslint:disable-next-line:no-var-keyword
var masonry = Isotope;

@Component({
  selector: '[masonry], masonry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ''
})

export class MasonryComponent implements OnInit, OnChanges, OnDestroy, AfterContentInit {

  constructor(  public el: ElementRef,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolService,
                private ngZone: NgZone ) {}


  @Input() public options: MasonryOptions;
  @Input() public filter = '*';
  @Input() public loadAllBeforeLayout: boolean;
  private isFirstItem = true;
  public isotope: any;
  private isDestroyed = false;

  ngOnInit() {
    log.debug('MasonryComponent: ngOnInit()');

    // Create jquery case-insensitive '::Contains' selector (as opposed to cases-sensitive '::contains')
    // To potentially be used in filtering
    $['expr'][':'].Contains = $['expr'].createPseudo(function(arg) {
      return function( elem ) {
          return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
      };
    });

    // Create masonry options object
    // if (!this.options) log.debug("couldn't get options!");
    // if (!this.options) this.options = {};

    // Set default itemSelector
    if (!this.options.itemSelector) {
      this.options.itemSelector = '[masonry-brick], masonry-brick';
    }

    // Set element display to block
    if (this.el.nativeElement.tagName === 'MASONRY') {
      this.el.nativeElement.style.display = 'block';
    }

    // Initialize Masonry
    this.isotope = new masonry('.grid', this.options);
    this.ngZone.runOutsideAngular( () => { this.isotope.on( 'layoutComplete', () => this.toolService.layoutComplete.next() ); } );

    // Bind to events
    // this.isotope.on('layoutComplete', (items: any) => this.layoutComplete.emit(items) );
    // this.isotope.on('removeComplete', (items: any) => this.removeComplete.emit(items) );
  }


  ngOnChanges(e: any): void {
    // log.debug("MasonryComponent: ngOnChanges()", e);

    if ('options' in e && this.isotope !== undefined ) {
      // log.debug("MasonryComponent: ngOnChanges() Got options", e.options.currentValue);
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
    }

    if ('filter' in e) {
      log.debug('MasonryComponent: ngOnChanges(): this.filter:', this.filter);
      if (this.isotope) { this.isotope.arrange( {filter: this.filter} ); }
    }

  }

  ngOnDestroy(): void {
    log.debug('MasonryComponent: ngOnDestroy().  Automatically destroying MasonryComponent'); // just informational so we know when parent has destroyed this
  }

  public destroyMe(): void {
    log.debug('MasonryComponent: destroyMe():  Manually destroying isotope');
    if (this.isotope) {
      this.ngZone.runOutsideAngular( () => { this.isotope.off( 'layoutComplete', () => this.toolService.layoutComplete.next() ); } );
      this.ngZone.runOutsideAngular( () => this.isotope.destroy() );
      // this.isotope = undefined;
      this.isDestroyed = true;
    }
  }

  ngAfterContentInit(): void {
    if (this.loadAllBeforeLayout) {
      imagesLoaded('.grid', (instance: any) => {
        log.debug('MasonryComponent: ngAfterContentInit(): All images have been loaded');
        this.layout();
      });
    }
  }



  public layout() {
    log.debug('MasonryComponent: layout()');
    this.changeDetectionRef.detectChanges();
    this.ngZone.runOutsideAngular( () => this.isotope.arrange() );
    // this.ngZone.runOutsideAngular( () => this.isotope.layout() );
    this.changeDetectionRef.markForCheck();
  }



  public add(element: HTMLElement) {

    /*let isFirstItem = false;
    // Check if first item
    if (this.isotope.items.length === 0){
        isFirstItem = true;
    }
    */

    if (this.loadAllBeforeLayout) {
      // complete fixed collections - let all images load before calling layout (done with imagesLoaded run from ngAfterContentInit)
      log.debug('MasonryComponent: add(): Adding element without layout (complete fixed collections)');
      this.el.nativeElement.appendChild(element);

      this.ngZone.runOutsideAngular( () => this.isotope.addItems(element) );
      // this.ngZone.runOutsideAngular( () => this.isotope.insert(element) );
      // this.ngZone.runOutsideAngular( () => this.isotope.arrange() );
      // this.changeDetectionRef.markForCheck();
    }


    if (!this.loadAllBeforeLayout) {
      // rolling/monitoring/still-building-fixed collections - we will append each image to the view, only calling layout after every item has loaded
      log.debug('MasonryComponent: add(): Appending element with layout (rolling/monitoring/still-building-fixed collections)');

      imagesLoaded(element, (instance: any) => {
        // this.el.nativeElement.appendChild(element); // add brick to shadow dom

        // Tell Isotope that a child brick has been added
        this.ngZone.runOutsideAngular( () => this.isotope.insert(element) );
        // this.ngZone.runOutsideAngular( () => this.isotope.addItems(element) ); // this will only layout the new item
        // this.ngZone.runOutsideAngular( () => this.isotope.appended(element) ); // this will only layout the new item
        // this.ngZone.runOutsideAngular( () => this.isotope.prepended(element) );
        // this.changeDetectionRef.markForCheck(); // we don't need this as we run it after layout anyway

        // layout if first item
        // I don't think we need this code now.  It seems to work perfectly well without it
        // if (this.isFirstItem) { this.layout(); }
        // if (this.isFirstItem) { this.ngZone.runOutsideAngular( () => this.isotope.arrange( {filter: '*'}) ); }
        // this.isFirstItem = false;
      });
    }



  }



  public remove(element: HTMLElement) {
    log.debug('MasonryComponent: remove()');
    this.el.nativeElement.remove(element); // remove brick from shadow dom

    // Tell Isotope that a child brick has been removed
    if (!this.isDestroyed ) {
      // log.debug('MasonryComponent: remove(): removing brick:', element);
      log.debug('MasonryComponent: remove(): removing brick:');
      this.ngZone.runOutsideAngular( () => this.isotope.remove(element)); // tell isotope that the brick has been removed
      // this.el.nativeElement.remove(element); // remove brick from shadow dom
      // this.changeDetectionRef.detectChanges();
      // this.changeDetectionRef.markForCheck();
      // Layout bricks
      this.layout();
    }
  }

}

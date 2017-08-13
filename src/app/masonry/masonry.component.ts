import { Component, OnInit, OnDestroy, OnChanges, AfterContentInit, Input, Output, ElementRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { MasonryOptions } from './masonry-options';
import { ToolService } from '../tool.service';
import { Brick } from '../brick';
declare var log: any;
// declare var require: any;
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
  @Input() public shownBricks: Brick[] = [];
  @Input() public loadAllBeforeLayout: boolean;
  private isFirstItem = true;
  public isotope: any;
  private isDestroyed = false;

  ngOnInit() {
    log.debug('MasonryComponent: ngOnInit()');

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

    if ('options' in e && this.isotope != undefined ) {
      // log.debug("MasonryComponent: ngOnChanges() Got options", e.options.currentValue);
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
    }


    setTimeout( () => {
      if ('shownBricks' in e) {
        // log.debug("MasonryComponent: ngOnChanges(): this.shownBricks", this.shownBricks);
        let parent = $('masonry');
        let elementsToHide: any = [];

        for (let i = 0; i < this.shownBricks.length; i++) {
          let brick: Brick = this.shownBricks[i];
          // let selector = "masonry-tile[image='" + brick.image + "'][sessionid='" + brick.session + "'][contenttype='" + brick.type + "']"; //original selector
          // tslint:disable-next-line:quotemark
          let selector = "masonry-tile[contentFile='" + brick.contentFile + "'][sessionid='" + brick.session + "'][contentType='" + brick.type + "']";
          if ('hashType' in brick) {
            // we have to add in this extra selector for hashes in the case where more one contentFile is
            // matched on multiple hashTypes in the same session id (say, from a zip file), to distinguish them
            // only one would be visible, otherwise
            // tslint:disable-next-line:quotemark
            selector = selector + "[hashType='" + brick.hashType + "']";
          }
          // log.debug("selector:", selector);
          let h = parent.find(selector).closest('masonry-tile');
          // log.debug("got to 2");
          if (h.length > 0) {
            // log.debug("got to 3");
            // log.debug("found brick");
            elementsToHide.push(h[0]);
          }
          else {
            // log.debug("got to 4");
            log.debug('MasonryComponent: ngOnChanges(): Could not find brick matching selector:', selector);
            log.debug('brick:', brick);
          }
        }
        // log.debug("finished loop");
        if (this.isotope) {
          // log.debug("got to 5");
          if (this.shownBricks.length === 0) {
            // log.debug("got to 6");
            this.isotope.arrange( {filter: '.none'} );
          }
          else if (elementsToHide.length > 0) {
            // log.debug("got to 7", elementsToHide);
            this.isotope.arrange( {filter: elementsToHide} );
          }
          else {
            // log.debug("got to 8");
            this.isotope.arrange( {filter: '*'} );
          }
          // log.debug("got to 9");
          // this.changeDetectionRef.detectChanges();
          // this.changeDetectionRef.markForCheck();
        }
      }
    }, 50);
  }

  ngOnDestroy(): void {
    log.debug('MasonryComponent: ngOnDestroy().  Automatically destroying MasonryComponent'); // just informational so we know when parent has destroyed this
  }

  public destroyMe(): void {
    log.debug('MasonryComponent: destroyMe():  Manually destroying isotope');
    if (this.isotope) {
      // this.ngZone.runOutsideAngular( () => this.isotope.destroy() );
      this.isotope = undefined;
      this.isDestroyed = true;
    }
  }

  public layout() {
    // log.debug('MasonryComponent: layout());
    this.ngZone.runOutsideAngular( () => this.isotope.arrange() );
  }

  ngAfterContentInit(): void {
    if (this.loadAllBeforeLayout) {
      imagesLoaded('.grid', (instance: any) => {
        log.debug('MasonryComponent: ngAfterContentInit(): All images have been loaded');
        this.layout();
      });
    }
  }


  public add(element: HTMLElement) {

    let isFirstItem = false;

    // Check if first item
    if (this.isotope.items.length === 0){
        isFirstItem = true;
    }

    if (!this.loadAllBeforeLayout) {
      log.debug('MasonryComponent: add(): Appending element with layout');
      imagesLoaded(element, (instance: any) => {
        this.el.nativeElement.appendChild(element);

        // Tell Masonry that a child element has been added
        this.ngZone.runOutsideAngular( () => this.isotope.insert(element) );

        // layout if first item
        if (isFirstItem) { this.layout(); }
      });
    }
    else { // let all images load before calling layout (done elsewhere)
      log.debug('MasonryComponent: add(): Adding element without layout');
      this.el.nativeElement.appendChild(element);
      this.ngZone.runOutsideAngular( () => this.isotope.addItems(element) );
    }

  }



  public remove(element: HTMLElement) {
    // Tell Masonry that a child element has been removed
    // log.debug("MasonryComponent: removing element", element);
    if (!this.isDestroyed ) {
      this.ngZone.runOutsideAngular( () => this.isotope.remove(element));

      // Layout items
      this.layout();
    }
    // log.debug('MasonryComponent:', 'Brick removed');
  }

}

import { Component, OnInit, OnDestroy, OnChanges, AfterContentInit, Input, Output, ElementRef, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { MasonryOptions } from './masonry-options';
import { ToolWidgetCommsService } from '../tool-widget.comms.service';
declare var require: any;
declare var imagesLoaded: any;
//var masonry = require('isotope-layout');
declare var Isotope;
var masonry = Isotope;
// import * as $ from 'jquery';
// declare var $: any;

@Component({
  selector: '[masonry], masonry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  //template: '<ng-content></ng-content>'
  template: ''
})

export class MasonryComponent implements OnInit, OnChanges, OnDestroy, AfterContentInit {

  constructor(  public el: ElementRef,
                private changeDetectionRef: ChangeDetectorRef,
                private toolService: ToolWidgetCommsService,
                private ngZone: NgZone ) {}

  public isotope: any;
  // private _imagesLoaded = null;

  // Inputs
  //@Input() public options: MasonryOptions;
  @Input() public options: MasonryOptions;
  //@Input() public useImagesLoaded: Boolean = false;
  @Input() public shownBricks: any = [];

  // Outputs
  //@Output() layoutComplete: EventEmitter<any[]> = new EventEmitter<any[]>();
  //@Output() removeComplete: EventEmitter<any[]> = new EventEmitter<any[]>();

  ngOnInit() {
    console.log("MasonryComponent: ngOnInit()");

    // Create masonry options object
    //if (!this.options) console.log("couldn't get options!");
    //if (!this.options) this.options = {};

    // Set default itemSelector
    if (!this.options.itemSelector) {
      this.options.itemSelector = '[masonry-brick], masonry-brick';
    }

    // Set element display to block
    if (this.el.nativeElement.tagName === 'MASONRY') {
      this.el.nativeElement.style.display = 'block';
    }

    // Initialize Masonry
    //this.isotope = new masonry(this.el.nativeElement, this.options);
    this.isotope = new masonry('.grid', this.options);
    //console.log("options:", this.options);
    //console.log("isotope:", this.isotope);
    /*this.isotope.on( 'layoutComplete', () => {
                                                //console.log("layout complete");
                                                this.toolService.layoutComplete.next();
                                                //this.changeDetectionRef.detectChanges();
                                                //this.changeDetectionRef.markForCheck();
                                              });*/
    this.ngZone.runOutsideAngular( () => { this.isotope.on( 'layoutComplete', () => this.toolService.layoutComplete.next() )} );
    //this.isotope.on( 'layoutComplete', () => {});
    // console.log('MasonryComponent:', 'Initialized');

    // Bind to events
    //this.isotope.on('layoutComplete', (items: any) => this.layoutComplete.emit(items) );
    //this.isotope.on('removeComplete', (items: any) => this.removeComplete.emit(items) );
  }






  ngOnChanges(e: any): void {
    console.log("MasonryComponent: ngOnChanges()", e);

    if ('options' in e && this.isotope != undefined ) {
      //console.log("MasonryComponent: ngOnChanges() Got options", e.options.currentValue);
      //console.log("isotope:", this.isotope)

      //this.isotope(e.options.currentValue);
      //this.layout();
       //this.ngZone.runOutsideAngular( () => this.isotope.arrange( {masonry: {columnWidth: this.options.columnWidth} } ) );
       this.ngZone.runOutsideAngular( () => this.isotope.arrange( this.options ) );
       //console.log("isotope:", this.isotope)
       //this.changeDetectionRef.detectChanges();
       //this.changeDetectionRef.markForCheck();
       //this.layout();

       //this.ngZone.runOutsideAngular( () => this.isotope.layout() );
       //this.isotope.arrange();
    }


    setTimeout( () => {
      if ('shownBricks' in e) {
        //console.log("got to 1", e.shownBricks.currentValue);
        //console.log("MasonryComponent: ngOnChanges(): this.shownBricks", this.shownBricks);
        let parent = $('masonry');
        //console.log("parent:", parent);
        let elementsToHide: any = [];

        for (let i=0; i < this.shownBricks.length; i++) {
          let brick = this.shownBricks[i];
          let selector = "masonry-tile[image='" + brick.image + "'][sessionid='" + brick.session + "'][contenttype='" + brick.type + "']";
          //console.log("selector:", selector);
          let h = parent.find(selector).closest('masonry-tile');
          //console.log("got to 2");
          if (h.length > 0) {
            //console.log("got to 3");
            //console.log("found brick");
            elementsToHide.push(h[0])
          }
          else {
            //console.log("got to 4");
            console.log("MasonryComponent: ngOnChanges(): Could not find brick");
          }
        }
        //console.log("finished loop");
        if (this.isotope) {
          //console.log("got to 5");
          if (this.shownBricks.length === 0) {
            //console.log("got to 6");
            this.isotope.arrange( {filter: '.none'} );
          }
          else if (elementsToHide.length > 0) {
            //console.log("got to 7", elementsToHide);
            this.isotope.arrange( {filter: elementsToHide} );
          }
          else {
            //console.log("got to 8");
            this.isotope.arrange( {filter: '*'} );
          }
          //console.log("got to 9");
          //this.changeDetectionRef.detectChanges();
          //this.changeDetectionRef.markForCheck();
        }
      }
    }, 50);

  //this.layout();

  }

  private isDestroyed: boolean = false;

  ngOnDestroy(): void {
    console.log("MasonryComponent: ngOnDestroy().  Automatically destroying MasonryComponent");
    /*
    if (this.isotope) {
      this.ngZone.runOutsideAngular( () => this.isotope.destroy() );
    }
    */

    //this.changeDetectionRef.detectChanges();
    //this.changeDetectionRef.markForCheck();
  }

  public destroyMe(): void {
    console.log("MasonryComponent: destroyMe().  Manually destroying isotope");
    if (this.isotope) {
      //this.ngZone.runOutsideAngular( () => this.isotope.destroy() );
      this.isotope = undefined;
      this.isDestroyed = true;
    }
  }

  public layout() {
    //console.log('MasonryComponent: layout()', 'Layout');
    //setTimeout( () => this.isotope.layout() );
    //this.ngZone.runOutsideAngular( () => this.isotope.layout() );
    this.ngZone.runOutsideAngular( () => this.isotope.arrange() );
    //this.ngZone.runOutsideAngular( () => this.isotope.arrange( {filter: '*'} ) );
    //this.changeDetectionRef.detectChanges();
    //this.changeDetectionRef.markForCheck();
    //console.log("layout done");
  }

  private isFirstItem: boolean = true;
  @Input() public loadAllBeforeLayout: boolean;

  ngAfterContentInit(): void {
    if (this.loadAllBeforeLayout) {
      imagesLoaded('.grid', (instance: any) => {
        console.log("MasonryComponent: ngAfterContentInit(): All images have been loaded");
        this.layout();
      });
    }
  }


  public add(element: HTMLElement) {

    let isFirstItem = false;

    // Check if first item
    if(this.isotope.items.length === 0){
        isFirstItem = true;
    }

    if (!this.loadAllBeforeLayout) {
      console.log("MasonryComponent: add(): Appending element with layout");
      imagesLoaded(element, (instance: any) => {
        this.el.nativeElement.appendChild(element);

        // Tell Masonry that a child element has been added
        //this.ngZone.runOutsideAngular( () => this.isotope.appended(element) );
        this.ngZone.runOutsideAngular( () => this.isotope.insert(element) );
        //this.ngZone.runOutsideAngular( () => this.isotope.addItems(element) );

        // layout if first item
        if (isFirstItem) this.layout();
        //this.layout();
        //this.changeDetectionRef.detectChanges();
        //this.changeDetectionRef.markForCheck();
      });

      //this.el.nativeElement.removeChild(element);
      //try {this.el.nativeElement.removeChild(element)} catch(err) {};
      //this.changeDetectionRef.detectChanges();
      //this.changeDetectionRef.markForCheck();
    }
    else { //let all images load before calling layout (done elsewhere)
      console.log("MasonryComponent: add(): Adding element without layout");
      this.el.nativeElement.appendChild(element);
      this.ngZone.runOutsideAngular( () => this.isotope.addItems(element) );
      //try {this.el.nativeElement.removeChild(element)} catch(err) {};
    }

  }



  public remove(element: HTMLElement) {
    // Tell Masonry that a child element has been removed
    //console.log("MasonryComponent: removing element", element);
    if (!this.isDestroyed ) {
      this.ngZone.runOutsideAngular( () => this.isotope.remove(element));
      //this.isotope.ignore(element);

      // Layout items
      this.layout();
    }
    //this.changeDetectionRef.detectChanges();
    //this.changeDetectionRef.markForCheck();

    // console.log('MasonryComponent:', 'Brick removed');
  }

}

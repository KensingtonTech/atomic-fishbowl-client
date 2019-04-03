import { Directive, Inject, ElementRef, forwardRef, Input, OnDestroy, AfterViewInit, NgZone, Renderer2 } from '@angular/core';
import { IsotopeDirective } from './isotope.directive';
import 'imagesloaded';
import { Logger } from 'loglevel';
declare var log: Logger;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[isotope-brick], isotope-brick'
})

export class IsotopeBrickDirective implements OnDestroy, AfterViewInit {

  // Enable mutation observer with [observeBrickMutations]="'true'"

  constructor(private el: ElementRef,
              private ngZone: NgZone,
              private renderer: Renderer2,
              @Inject(forwardRef(() => IsotopeDirective)) private parent: IsotopeDirective ) {}

  // tslint:disable-next-line:no-input-rename
  @Input('observeBrickMutations') private enableObserver = false;

  private observer: MutationObserver = null;
  private imgsLoaded: ImagesLoaded.ImagesLoaded = null;
  private loadComplete = false;


  ngAfterViewInit(): void {

    this.renderer.setStyle(this.el.nativeElement, 'visibility', 'hidden');
    this.ngZone.runOutsideAngular( () => {
      // we need the image to be completely loaded before it gets laid out by isotope
      this.imgsLoaded = imagesLoaded(this.el.nativeElement);
      this.imgsLoaded.on('always', this.onImagesLoadedComplete);
     } );
    if (this.enableObserver) {
      // enable mutation watcher
      log.debug('IsotopeBrickDirective: ngAfterViewInit(): Enabling mutation observer');
      this.watchForHtmlChanges(); }
  }



  ngOnDestroy(): void {
    // log.debug('IsotopeBrickDirective: ngOnDestroy() removing brick');
    if (!this.loadComplete) {
      this.imgsLoaded.off('always', this.onImagesLoadedComplete);
    }
    this.parent.remove(this.el);
    if (this.observer) {
      this.observer.disconnect();
    }
  }



  onImagesLoadedComplete = () => {
    this.parent.add(this.el);
    this.imgsLoaded.off('always', this.onImagesLoadedComplete);
    this.loadComplete = true;
  }



  private watchForHtmlChanges(): void {
    /** When HTML in brick changes dynamically, observe that and change layout */

    if (MutationObserver) {
      /** Watch for any changes to subtree */
      let self = this;
      this.observer = new MutationObserver(function(mutations, observerFromElement) {
        log.debug('IsotopeBrickDirective: watchForHtmlChanges(): MutationObserver: calling layout()');
        self.parent.layout();
      });

      // define what element should be observed by the observer
      // and what types of mutations trigger the callback
      this.observer.observe(this.el.nativeElement, {
        subtree: true,
        childList: true
      });
    }
    else {
      log.error('IsotopeBrickDirective: watchForHtmlChanges(): This browser is too old to use the MutationObserver API');
    }
  }



}

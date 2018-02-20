import { Directive, Inject, ElementRef, forwardRef, Input, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
import { IsotopeDirective } from './isotope.directive';
import * as imagesLoaded from 'imagesloaded';
import * as log from 'loglevel';

interface MutationWindow extends Window {
  MutationObserver: any;
  WebKitMutationObserver: any;
}

declare var window: MutationWindow;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[isotope-brick], isotope-brick'
})

export class IsotopeBrickDirective implements OnDestroy, AfterViewInit {

  // Enable mutation observer with [observeBrickMutations]="'true'"

  constructor(private el: ElementRef,
              private ngZone: NgZone,
              @Inject(forwardRef(() => IsotopeDirective)) private parent: IsotopeDirective ) {}

  // tslint:disable-next-line:no-input-rename
  @Input('observeBrickMutations') private enableObserver = false;

  private observer: MutationObserver;
  private imgsLoaded: any;
  private loadComplete = false;


  ngAfterViewInit(): void {

    this.el.nativeElement.style.display = 'none'; // isotope.directive will unhide the element after it's been laid-out
    this.ngZone.runOutsideAngular( () => {
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
    this.loadComplete = true;
  }



  /** When HTML in brick changes dynamically, observe that and change layout */
  private watchForHtmlChanges(): void {

    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    if (MutationObserver) {
      /** Watch for any changes to subtree */
      let self = this;
      this.observer = new MutationObserver(function(mutations, observerFromElement) {
        log.debug('IsotopeBrickDirective: watchForHtmlChanges: MutationObserver: calling layout()');
        self.parent.layout();
      });

      // define what element should be observed by the observer
      // and what types of mutations trigger the callback
      this.observer.observe(this.el.nativeElement, {
        subtree: true,
        childList: true
      });
    }
  }



}

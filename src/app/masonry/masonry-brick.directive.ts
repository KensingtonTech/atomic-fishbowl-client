import { Directive, Inject, ElementRef, forwardRef, Input, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MasonryComponent } from './masonry.component';
declare var log: any;

interface MutationWindow extends Window {
  MutationObserver: any;
  WebKitMutationObserver: any;
}

declare var window: MutationWindow;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[masonry-brick]'
})

export class MasonryBrickDirective implements OnDestroy, AfterViewInit {

  // Enable mutation observer with [masonry-brick]="'true'"

  constructor(private el: ElementRef,
              private changeDetectorRef: ChangeDetectorRef,
              @Inject(forwardRef(() => MasonryComponent)) private parent: MasonryComponent ) {}

  // tslint:disable-next-line:no-input-rename
  @Input('masonry-brick') private enableObserver = false;

  ngAfterViewInit(): void {
    // this.parent.add(this.el.nativeElement);
    this.parent.add(this.el);
    this.changeDetectorRef.markForCheck();
    if (this.enableObserver) {
      // enable mutation watcher
      log.debug('MasonryBrickDirective: ngAfterViewInit(): Enabling mutation observer');
      this.watchForHtmlChanges(); }
  }

  ngOnDestroy(): void {
    // log.debug("AngularMasonryBrick: ngOnDestroy() removing brick");
    // this.parent.remove(this.el.nativeElement);
    this.parent.remove(this.el);
  }

  /** When HTML in brick changes dynamically, observe that and change layout */
  private watchForHtmlChanges(): void {
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    if (MutationObserver) {
      /** Watch for any changes to subtree */
      let self = this;
      let observer = new MutationObserver(function(mutations, observerFromElement) {
        log.debug('MasonryBrickDirective: watchForHtmlChanges: MutationObserver: calling layout()');
        self.parent.layout();
      });

      // define what element should be observed by the observer
      // and what types of mutations trigger the callback
      observer.observe(this.el.nativeElement, {
        subtree: true,
        childList: true
      });
    }
  }

}

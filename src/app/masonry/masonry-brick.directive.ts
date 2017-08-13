import { Directive, Inject, ElementRef, forwardRef, OnDestroy, AfterViewInit, AfterContentInit } from '@angular/core';
import { MasonryComponent } from './masonry.component';
import { MasonryTileComponent } from '../masonry-tile.component';
declare var log: any;

interface MutationWindow extends Window {
  MutationObserver: any;
  WebKitMutationObserver: any;
}

declare var window: MutationWindow;

@Directive({
  selector: '[masonry-brick], masonry-brick',
})

export class AngularMasonryBrick implements OnDestroy, AfterViewInit {

  constructor(  private el: ElementRef,
                @Inject(forwardRef(() => MasonryComponent)) private parent: MasonryComponent,
                @Inject(forwardRef(() => MasonryTileComponent)) private masonryTileComponent: MasonryTileComponent
             ) {
                  //log.debug("el:", this.el);
                  //log.debug("masonryDisplayComponent:", this.masonryDisplayComponent);
               }

  ngAfterViewInit(): void {
  //ngAfterContentInit(): void {
    //this.parent.add(this.el.nativeElement);
    this.parent.add(this.masonryTileComponent.el.nativeElement);
    //this.watchForHtmlChanges(); //enable mutation watcher
  }

  ngOnDestroy(): void {
    //this.parent.remove(this.el.nativeElement);
    //log.debug("AngularMasonryBrick: ngOnDestroy() removing brick");
    this.parent.remove(this.masonryTileComponent.el.nativeElement);
  }

  /** When HTML in brick changes dynamically, observe that and change layout */
  private watchForHtmlChanges(): void {
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    if (MutationObserver) {
      /** Watch for any changes to subtree */
      let self = this;
      let observer = new MutationObserver(function(mutations, observerFromElement) {
        self.parent.layout();
      });

      // define what element should be observed by the observer
      // and what types of mutations trigger the callback
      //observer.observe(this.el.nativeElement, {
      observer.observe(this.masonryTileComponent.el.nativeElement, {
        subtree: true,
        childList: true
      });
    }
  }

}

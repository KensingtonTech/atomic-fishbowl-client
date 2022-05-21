import {
  Directive,
  Inject,
  ElementRef,
  forwardRef,
  Input,
  OnDestroy,
  AfterViewInit,
  NgZone,
  Renderer2,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { IsotopeDirective } from './isotope.directive';
import * as log from 'loglevel';


@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[isotope-brick], isotope-brick'
})

export class IsotopeBrickDirective implements OnChanges, OnDestroy, AfterViewInit {

  constructor(
    private el: ElementRef,
    private ngZone: NgZone,
    private renderer: Renderer2,
    @Inject(forwardRef(() => IsotopeDirective)) private isotopeDirective: IsotopeDirective
  ) {}

  // tslint:disable-next-line:no-input-rename
  @Input() private enableObserver = false;

  private observer: MutationObserver;


  ngAfterViewInit(): void {
    this.renderer.setStyle(this.el.nativeElement, 'visibility', 'hidden');
    // this.el.nativeElement.parentElement.removeChild(this.el.nativeElement); // will be re-added to DOM later by isotope.directive
    this.ngZone.runOutsideAngular(
      () => this.el.nativeElement.addEventListener('onloaded', this.onImagesLoadedComplete )
    );
    if (this.enableObserver) {
      // enable mutation watcher
      log.debug('IsotopeBrickDirective: ngAfterViewInit(): Enabling mutation observer');
      this.watchForHtmlChanges(); }
  }



  ngOnDestroy(): void {
    // log.debug('IsotopeBrickDirective: ngOnDestroy() removing brick');
    this.isotopeDirective.remove(this.el);
    this.ngZone.runOutsideAngular(
      () => this.el.nativeElement.removeEventListener('onloaded', this.onImagesLoadedComplete )
    );
    if (this.observer) {
      this.observer.disconnect();
    }
  }



  ngOnChanges(values: SimpleChanges) {
    if (values && values.imageLoaded.currentValue === true && values.imageLoaded.previousValue === false) {
      this.onImagesLoadedComplete();
    }
  }



  onImagesLoadedComplete = () => {
    // log.debug('IsotopeBrickDirective: onImagesLoadedComplete(): proceeding to add brick to Isotope');
    this.isotopeDirective.addBrick(this.el);
  };



  private watchForHtmlChanges(): void {
    /** When HTML in brick changes dynamically, observe that and change layout */

    if (MutationObserver) {
      /** Watch for any changes to subtree */
      this.observer = new MutationObserver( () => {
        log.debug('IsotopeBrickDirective: watchForHtmlChanges(): MutationObserver: calling layout()');
        this.isotopeDirective.layout();
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

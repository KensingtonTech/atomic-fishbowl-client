import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  NgZone,
  ViewChild
} from '@angular/core';
import { Subscription, Subject } from 'rxjs';

interface CalulatedStyle {
  height: number;
  top: number;
}

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'p-scrollPanel-custom',
    templateUrl: './scrollpanel.component.html'
})
export class CustomScrollPanelComponent implements AfterViewInit, OnDestroy {

  @Input() style: Record<string, any>;
  @Input() styleClass: string;
  @Input() scrollbarMovedSubject: Subject<number>; // emits
  @Input() scrollTopChangedSubject: Subject<number>; // receives
  @Input() containerHeightChangedSubject: Subject<number>; // receives
  @Input() contentHeightChangedSubject: Subject<number>; // receives

  @ViewChild('container', { static: true }) containerRef: ElementRef<HTMLElement>;
  @ViewChild('yBar', { static: true }) yBarRef: ElementRef<HTMLElement>;

  private scrollTop = 0;
  private containerHeight = 0;
  private contentHeight = 0;
  private scrollYRatio: number;
  private initialized: boolean;
  private lastPageY: number;
  private isXBarClicked: boolean;
  private isYBarClicked: boolean;
  private subscriptions = new Subscription();

  timeoutFrame = (cb: () => void) => setTimeout(cb, 0);

  constructor(
    public el: ElementRef,
    public zone: NgZone
  ) {}




  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.moveBar();
      this.moveBar = this.moveBar.bind(this);
      this.onYBarMouseDown = this.onYBarMouseDown.bind(this);
      this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this);
      this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this);
      this.yBarRef.nativeElement.addEventListener('mousedown', this.onYBarMouseDown);
      this.initialized = true;
    });

    this.subscriptions.add(
      this.scrollTopChangedSubject.subscribe(
        scrollTop => this.onScrollTopChanged(scrollTop)
      )
    );
    this.subscriptions.add(
      this.containerHeightChangedSubject.subscribe(
        containerHeight => this.onContainerHeightChanged(containerHeight)
      )
    );
    this.subscriptions.add(
      this.contentHeightChangedSubject.subscribe(
        contentHeight => this.onContentHeightChanged(contentHeight)
      )
    );
  }



  onScrollTopChanged(scrollTop: number) {
    this.scrollTop = scrollTop;
    this.moveBar();
  }



  onContainerHeightChanged(containerHeight: number) {
    this.containerHeight = containerHeight;
    this.containerRef.nativeElement.style.height = `${containerHeight}px`;
    this.moveBar();
  }



  onContentHeightChanged(contentHeight: number) {
    this.contentHeight  = contentHeight;
    this.moveBar();
  }



  moveBar() {
    /* vertical scroll */
    const yBar = this.yBarRef.nativeElement;
    const containerHeight = this.containerHeight; // height of container
    const contentHeight = this.contentHeight;  // height of content

    this.scrollYRatio = containerHeight / contentHeight;

    this.requestAnimationFrame(() => {
      if (this.scrollYRatio >= 1) {
        this.addClass(yBar, 'p-scrollpanel-hidden');
      }
      else {
        this.removeClass(yBar, 'p-scrollpanel-hidden');
        const top = containerHeight * (this.scrollTop / contentHeight);
        const calculatedStyle = {
          height: containerHeight * this.scrollYRatio,
          top
        };
        const heightAndTop = this.enforceMinHandleHeight(containerHeight * .05, calculatedStyle);
        yBar.style.cssText = `height: ${heightAndTop.height}px; top: ${heightAndTop.top}px;`;
      }
    });
  }



  enforceMinHandleHeight(minHeight: number, calculatedStyle: CalulatedStyle) {
    // from https://github.com/rommguy/react-custom-scroll - MIT License
    if (calculatedStyle.height >= minHeight) {
      return calculatedStyle;
    }

    const diffHeightBetweenMinAndCalculated = minHeight - calculatedStyle.height;
    const scrollPositionToAvailableScrollRatio = this.scrollTop / (this.contentHeight - this.containerHeight);
    const scrollHandlePosAdjustmentForMinHeight = diffHeightBetweenMinAndCalculated * scrollPositionToAvailableScrollRatio;
    const handlePosition = calculatedStyle.top - scrollHandlePosAdjustmentForMinHeight;

    return {
      height: minHeight,
      top: handlePosition
    };
  }




  onYBarMouseDown(event: MouseEvent) {
    this.isYBarClicked = true;
    this.lastPageY = event.pageY;
    this.addClass(this.yBarRef.nativeElement, 'p-scrollpanel-grabbed');
    this.addClass(document.body, 'p-scrollpanel-grabbed');

    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseup', this.onDocumentMouseUp);
    event.preventDefault();
  }



  onDocumentMouseMove(event: MouseEvent) {
    if (this.isXBarClicked) {
      // do nothing
    }
    else if (this.isYBarClicked) {
      this.onMouseMoveForYBar(event);
    }
    else {
      this.onMouseMoveForYBar(event);
    }
  }



  onMouseMoveForYBar(event: MouseEvent) {
    const deltaY = event.pageY - this.lastPageY;
    this.lastPageY = event.pageY;
    this.scrollbarMovedSubject.next(this.scrollTop + deltaY / this.scrollYRatio);
  }



  onDocumentMouseUp() {
    this.removeClass(this.yBarRef.nativeElement, 'p-scrollpanel-grabbed');
    this.removeClass(document.body, 'p-scrollpanel-grabbed');
    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
    this.isXBarClicked = false;
    this.isYBarClicked = false;
  }



  requestAnimationFrame(f: () => void) {
    const frame = window.requestAnimationFrame ?? this.timeoutFrame;
    frame(f);
  }



  ngOnDestroy() {
    if (this.initialized) {
      window.removeEventListener('resize', this.moveBar);
      this.yBarRef.nativeElement.removeEventListener('mousedown', this.onYBarMouseDown);
      document.removeEventListener('mousemove', this.onDocumentMouseMove); // just in case
      document.removeEventListener('mouseup', this.onDocumentMouseUp); // just in case
    }
    this.subscriptions.unsubscribe();
  }



  addClass(element: HTMLElement, className: string): void {
    if (element.classList) {
      element.classList.add(className);
    }
    else {
      element.className += ' ' + className;
    }
  }



  removeClass(element: HTMLElement, className: string): void {
    if (element.classList) {
      element.classList.remove(className);
    }
    else {
      element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  }

}

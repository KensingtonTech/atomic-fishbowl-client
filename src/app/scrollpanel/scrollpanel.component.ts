import { Component, Input, AfterViewInit, OnDestroy, ElementRef, NgZone, ViewChild } from '@angular/core';
import { Subscription, Subject } from 'rxjs';

@Component({
    selector: 'p-scrollPanel-custom',
    templateUrl: './scrollpanel.component.html'
})


export class CustomScrollPanelComponent implements AfterViewInit, OnDestroy {

  @Input() style: any;

  @Input() styleClass: string;

  @Input() scrollbarMovedSubject: Subject<number>; // emits

  @Input() scrollTopChangedSubject: Subject<number>; // receives

  @Input() containerHeightChangedSubject: Subject<number>; // receives

  @Input() contentHeightChangedSubject: Subject<number>; // receives

  _scrollTop = 0;

  _containerHeight = 0;

  _contentHeight = 0;

  @ViewChild('container', { static: true }) containerRef: ElementRef;

  // @ViewChild('content') contentRef: ElementRef;

  // @ViewChild('xBar') xBarRef: ElementRef;

  @ViewChild('yBar', { static: true }) yBarRef: ElementRef;

  scrollYRatio: number;

  // scrollXRatio: number;

  initialized: boolean;

  lastPageY: number;

  lastPageX: number;

  isXBarClicked: boolean;

  isYBarClicked: boolean;

  subscriptions = new Subscription;

  constructor(public el: ElementRef, public zone: NgZone) {}

  timeoutFrame: any = (fn) => setTimeout(fn, 0);



  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.moveBar();
      this.moveBar = this.moveBar.bind(this);
      // this.onXBarMouseDown = this.onXBarMouseDown.bind(this);
      this.onYBarMouseDown = this.onYBarMouseDown.bind(this);
      this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this);
      this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this);

      // window.addEventListener('resize', this.moveBar);
      // this.contentRef.nativeElement.addEventListener('scroll', this.moveBar);
      // this.contentRef.nativeElement.addEventListener('mouseenter', this.moveBar);
      // this.xBarRef.nativeElement.addEventListener('mousedown', this.onXBarMouseDown);
      this.yBarRef.nativeElement.addEventListener('mousedown', this.onYBarMouseDown);

      // this.calculateContainerHeight();

      this.initialized = true;
    });

    this.subscriptions.add( this.scrollTopChangedSubject.subscribe( scrollTop => this.onScrollTopChanged(scrollTop)) );
    this.subscriptions.add( this.containerHeightChangedSubject.subscribe( containerHeight => this.onContainerHeightChanged(containerHeight) ) );
    this.subscriptions.add( this.contentHeightChangedSubject.subscribe( contentHeight => this.onContentHeightChanged(contentHeight) ) );

  }



  onScrollTopChanged(scrollTop) {
    // console.log('scrollTop:', position);
    this._scrollTop = scrollTop;
    this.moveBar();
  }



  onContainerHeightChanged(containerHeight) {
    // console.log('containerHeight:', containerHeight);
    this._containerHeight = containerHeight;
    this.containerRef.nativeElement.style['height'] = `${containerHeight}px`;
    this.moveBar();
  }



  onContentHeightChanged(contentHeight) {
    // console.log('contentHeight:', contentHeight);
    this._contentHeight  = contentHeight;
    this.moveBar();
    // this.containerRef.nativeElement.style['height'] = `${contentHeight}px`;
  }



  /*calculateContainerHeight() {
    let container = this.containerRef.nativeElement;
    // let content = this.contentRef.nativeElement;
    let xBar = this.xBarRef.nativeElement;

    let containerStyles = getComputedStyle(container);
    let xBarStyles = getComputedStyle(xBar);
    let pureContainerHeight = this.getHeight(container) - parseInt(xBarStyles['height'], 10);

    if (containerStyles['max-height'] !== 'none' && pureContainerHeight === 0) {
      if (content.offsetHeight + parseInt(xBarStyles['height'], 10) > parseInt(containerStyles['max-height'], 10)) {
        container.style.height = containerStyles['max-height'];
      }
      else {
        container.style.height = content.offsetHeight + parseFloat(containerStyles.paddingTop) + parseFloat(containerStyles.paddingBottom) + parseFloat(containerStyles.borderTopWidth) + parseFloat(containerStyles.borderBottomWidth) + 'px';
      }
    }
  }*/



  moveBar() {
    // let container = this.containerRef.nativeElement;
    // let content = this.contentRef.nativeElement;

    /* horizontal scroll */
    /*let xBar = this.xBarRef.nativeElement;
    let totalWidth = content.scrollWidth;
    let ownWidth = content.clientWidth;
    let bottom = (container.clientHeight - xBar.clientHeight) * -1;

    this.scrollXRatio = ownWidth / totalWidth;*/

    /* vertical scroll */
    let yBar = this.yBarRef.nativeElement;
    // let totalHeight = content.scrollHeight; // height of content
    // let ownHeight = content.clientHeight; // height of container

    let containerHeight = this._containerHeight; // height of container
    let contentHeight = this._contentHeight;  // height of content
    // let right = (container.clientWidth - yBar.clientWidth) * -1;

    /*console.log('moveBar(): containerHeight:', this._containerHeight);
    console.log('moveBar(): contentHeight:', this._contentHeight);
    console.log('moveBar(): scrollTop:', this._scrollTop);*/

    this.scrollYRatio = containerHeight / contentHeight;

    this.requestAnimationFrame(() => {
      /*if (this.scrollXRatio >= 1) {
        this.addClass(xBar, 'ui-scrollpanel-hidden');
      }
      else {
        this.removeClass(xBar, 'ui-scrollpanel-hidden');
        xBar.style.cssText = 'width:' + Math.max(this.scrollXRatio * 100, 10) + '%; left:' + (content.scrollLeft / totalWidth) * 100 + '%;bottom:' + bottom + 'px;';
      }*/

      if (this.scrollYRatio >= 1) {
        this.addClass(yBar, 'ui-scrollpanel-hidden');
      }
      else {
        this.removeClass(yBar, 'ui-scrollpanel-hidden');
        let top = containerHeight * (this._scrollTop / contentHeight);
        let calculatedStyle = { height: containerHeight * this.scrollYRatio, top: top};
        let heightAndTop = this.enforceMinHandleHeight(containerHeight * .05, calculatedStyle);
        yBar.style.cssText = `height: ${heightAndTop.height}px; top: ${heightAndTop.top}px;`;
      }
    });
  }



  enforceMinHandleHeight(minHeight, calculatedStyle) {
    // from https://github.com/rommguy/react-custom-scroll - MIT License
    if (calculatedStyle.height >= minHeight) {
      return calculatedStyle;
    }

    const diffHeightBetweenMinAndCalculated = minHeight - calculatedStyle.height;
    const scrollPositionToAvailableScrollRatio = this._scrollTop / (this._contentHeight - this._containerHeight);
    const scrollHandlePosAdjustmentForMinHeight = diffHeightBetweenMinAndCalculated * scrollPositionToAvailableScrollRatio;
    const handlePosition = calculatedStyle.top - scrollHandlePosAdjustmentForMinHeight;

    return {
      height: minHeight,
      top: handlePosition
    };
  }




  onYBarMouseDown(e: MouseEvent) {
    this.isYBarClicked = true;
    this.lastPageY = e.pageY;
    this.addClass(this.yBarRef.nativeElement, 'ui-scrollpanel-grabbed');

    this.addClass(document.body, 'ui-scrollpanel-grabbed');

    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseup', this.onDocumentMouseUp);
    e.preventDefault();
  }



  /*onXBarMouseDown(e: MouseEvent) {
    this.isXBarClicked = true;
    this.lastPageX = e.pageX;
    this.addClass(this.xBarRef.nativeElement, 'ui-scrollpanel-grabbed');

    this.addClass(document.body, 'ui-scrollpanel-grabbed');

    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseup', this.onDocumentMouseUp);
    e.preventDefault();
  }*/



  onDocumentMouseMove(e: MouseEvent) {
    if (this.isXBarClicked) {
        // this.onMouseMoveForXBar(e);
    }
    else if (this.isYBarClicked) {
      this.onMouseMoveForYBar(e);
    }
    else {
        // this.onMouseMoveForXBar(e);
        this.onMouseMoveForYBar(e);
    }
  }



  /*onMouseMoveForXBar(e: MouseEvent) {
    let deltaX = e.pageX - this.lastPageX;
    this.lastPageX = e.pageX;

    this.requestAnimationFrame(() => {
      this.contentRef.nativeElement.scrollLeft += deltaX / this.scrollXRatio;
    });
  }*/



  onMouseMoveForYBar(e: MouseEvent) {
    let deltaY = e.pageY - this.lastPageY;
    this.lastPageY = e.pageY;

    /*this.requestAnimationFrame(() => {
      this.contentRef.nativeElement.scrollTop += deltaY / this.scrollYRatio;
    });*/
    this.scrollbarMovedSubject.next(this._scrollTop + deltaY / this.scrollYRatio);
  }



  /*scrollTop(scrollTop: number) {
    let scrollableHeight = this.contentRef.nativeElement.scrollHeight - this.contentRef.nativeElement.clientHeight;
    scrollTop = scrollTop > scrollableHeight ? scrollableHeight : scrollTop > 0 ? scrollTop : 0;
    this.contentRef.nativeElement.scrollTop = scrollTop;
  }*/



  onDocumentMouseUp(e: Event) {
    this.removeClass(this.yBarRef.nativeElement, 'ui-scrollpanel-grabbed');
    // this.removeClass(this.xBarRef.nativeElement, 'ui-scrollpanel-grabbed');
    this.removeClass(document.body, 'ui-scrollpanel-grabbed');

    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
    this.isXBarClicked = false;
    this.isYBarClicked = false;
  }



  requestAnimationFrame(f: Function) {
    let frame = window.requestAnimationFrame || this.timeoutFrame;
    frame(f);
  }



  ngOnDestroy() {
    if (this.initialized) {
      window.removeEventListener('resize', this.moveBar);
      // this.contentRef.nativeElement.removeEventListener('scroll', this.moveBar);
      // this.contentRef.nativeElement.removeEventListener('mouseenter', this.moveBar);
      // this.xBarRef.nativeElement.removeEventListener('mousedown', this.onXBarMouseDown);
      this.yBarRef.nativeElement.removeEventListener('mousedown', this.onYBarMouseDown);
      document.removeEventListener('mousemove', this.onDocumentMouseMove); // just in case
      document.removeEventListener('mouseup', this.onDocumentMouseUp); // just in case
    }
    this.subscriptions.unsubscribe();
  }



  /*getHeight(el): number {
    let height = el.offsetHeight;
    let style = getComputedStyle(el);

    height -= parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);

    return height;
  }*/



  addClass(element: any, className: string): void {
    if (element.classList) {
      element.classList.add(className);
    }
    else {
      element.className += ' ' + className;
    }
  }



  removeClass(element: any, className: string): void {
    if (element.classList) {
      element.classList.remove(className);
    }
    else {
      element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  }

}

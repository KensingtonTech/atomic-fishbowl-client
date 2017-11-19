import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, AfterContentInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Input, Renderer2, NgZone, AfterViewChecked, ViewEncapsulation } from '@angular/core';
import { PanZoomConfig } from './panzoom-config';
import { Point } from './panzoom-point';
import { PanZoomModel } from './panzoom-model';
import { PanZoomAPI } from './panzoom-api';
import { Rect } from './panzoom-rect';
import * as math from 'mathjs';
import * as $ from 'jquery';
declare var log;

interface ZoomAnimation {
  deltaZoomLevel;
  translationFromZoom: Function;
  duration;
  progress;
}

interface Position {
  x?: number;
  y?: number;
  length?: number;
}

@Component( {
  selector: 'panzoom',
  changeDetection: ChangeDetectionStrategy.OnPush,  // we don't want to kill change detection for all elements beneath this.  They can implement OnPush if they want to
  template: `
<div #panzoomElement class="pan-zoom-frame" (dblclick)="onDblClick($event)" (mousedown)="onMousedown($event)" (kwheel)="onMouseWheel($event)"  style="position:relative; overflow: hidden;">
  <div #panElement style="position: absolute; left: 0px; top: 0px;">
    <div #zoomElement> <!--style="will-change: transform;"-->
      <ng-content></ng-content>
    </div>
  </div>
</div>
<div #panzoomOverlay style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; display: none; pointer-events: none;"></div>
  `
} )

export class PanZoomComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor ( private el: ElementRef,
                private renderer: Renderer2,
                private zone: NgZone,
                private changeDetectionRef: ChangeDetectorRef )
    {
      this.element = el.nativeElement;
    }

  @ViewChild('panElement') private panElementRef: ElementRef;
  @ViewChild('zoomElement') private zoomElementRef: ElementRef;
  @ViewChild('panzoomElement') private frameElementRef: ElementRef;
  @ViewChild('panzoomOverlay') private panzoomOverlayRef: ElementRef;
  @Input() private id: string;
  @Input() private addStyle: string; // gets appended to style attribute of div.#panzoomElement
  @Input() private config: PanZoomConfig;

  private base: PanZoomModel; // this is what are view actually is
  private model: PanZoomModel; // this is used to transition to what we want the view to be
  private api: PanZoomAPI;
  private viewportHeight: number;
  private viewportWidth: number;
  private lastMouseEventTime: number;
  private previousPosition: Position = null;
  private scopeIsDestroyed = false;
  private dragging = false;
  private panVelocity: Point = null;
  private zoomAnimation: ZoomAnimation = null;
  private element: HTMLElement;
  private frameElement: JQuery;
  private panElement: HTMLElement;
  private zoomElement: HTMLElement;
  private panzoomOverlay: HTMLElement;
  private animationFrame: Function; // reference to the appropriate getAnimationFrame function for the client browser
  private onMouseMoveRemoveFunc: Function;
  private onMouseUpRemoveFunc: Function;
  private onTouchEndRemoveFunc: Function;
  private onTouchMoveRemoveFunc: Function;
  private touchStartRemoveFunc: Function;
  private lastTick = 0;
  private chrome = false;
  private animationId: number;
  private isMobile = false;
  private scale: number;
  private zoomingToFit = false;

  private maxScale: number; // the highest scale that we will allow in free zoom mode (calculated)
  private minScale: number; // the smallest scale that we will allow in free zoom mode (calculated)

  ngOnInit(): void {
    log.debug('PanZoomComponent: ngOnInit(): initializing PanZoomComponent');
    let frameStyle = this.frameElementRef.nativeElement.attributes.style.value;
    this.renderer.setAttribute(this.frameElementRef.nativeElement, 'style', frameStyle + this.addStyle);

    if (this.config.initialZoomToFit) {
      this.base = this.calcZoomToFit(this.config.initialZoomToFit);
    }
    else {
      this.base = {
        zoomLevel: this.config.initialZoomLevel,
        pan: {
          x: this.config.initialPanX,
          y: this.config.initialPanY
        }
      };
    }

    // log.debug(this.base);
    this.model = {
                    zoomLevel: this.base.zoomLevel,
                    isPanning: false,     // Only true if panning has actually taken place, not just after mousedown
                    pan: {
                      x: this.base.pan.x,
                      y: this.base.pan.y
                    }
                  };


    // create public API
    this.api = {
      model: this.model,
      config: this.config,
      changeZoomLevel: this.changeZoomLevel.bind(this),
      zoomIn: this.zoomIn.bind(this),
      zoomOut: this.zoomOut.bind(this),
      zoomToFit: this.zoomToFit.bind(this),
      getViewPosition: this.getViewPosition.bind(this),
      getModelPosition: this.getModelPosition.bind(this)
    };

    this.config.newApi.next(this.api);

    if (this.config.freeMouseWheel) {
      this.scale = this.getCssScale(this.config.initialZoomLevel);
      // log.debug('scale:', this.scale);
      let maxZoomLevel = this.config.zoomLevels - 1;
      // log.debug('maxZoomLevel:', maxZoomLevel);
      this.maxScale = this.getCssScale(maxZoomLevel);
      // log.debug('maxScale:', this.maxScale);
      this.minScale = this.getCssScale(0);
      // log.debug('minScale:', this.minScale);
    }

  }


  ngAfterViewInit(): void {
    log.debug('PanZoomComponent: ngAfterContentInit()');

    this.frameElement = $('.pan-zoom-frame');

    this.viewportHeight = this.frameElement.find('.zoom-element').children().height();
    this.viewportWidth = this.frameElement.find('.zoom-element').children().width();

    this.panElement = this.panElementRef.nativeElement;
    this.zoomElement = this.zoomElementRef.nativeElement;
    this.panzoomOverlay = this.panzoomOverlayRef.nativeElement;

    if (navigator.userAgent.search('Firefox') >= 0) {
       this.renderer.setStyle(this.zoomElement, 'will-change', 'transform');
    }

    if (navigator.userAgent.search('Chrome') >= 0) {
      this.chrome = true;
      // this.renderer.setStyle(this.zoomElement, 'transform', 'translateZ(0)');

  }

/*
    //Don't think the overlay is necessary in Angular 2.  Will check
    var $overlay;
    var existing = $document.find('#PanZoomOverlay');
    if (existing.length === 0) {
        $overlay = $('<div id="PanZoomOverlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; display: none;"></div>');
        $document.find('body').append($overlay);
    } else {
      $overlay = existing;
    }
*/

    this.animationFrame =   window.requestAnimationFrame ||
                            (<any>window).webkitRequestAnimationFrame ||
                            (<any>window).mozRequestAnimationFrame ||
                            (<any>window).oRequestAnimationFrame ||
                            (<any>window).msRequestAnimationFrame;


    if (this.isMobileDevice()) {
      this.isMobile = true;
      this.touchStartRemoveFunc = this.renderer.listen(this.element, 'touchstart', (event: any) => this.onTouchStart(event) );
    }

  }


  ngOnDestroy(): void {
    log.debug('PanZoomComponent: ngOnDestroy()');
    if (this.touchStartRemoveFunc) {
      this.touchStartRemoveFunc();
    }
    this.frameElement = undefined;
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationId);
    }
    this.animationFrame = undefined;
    this.scopeIsDestroyed = true;
  }

  ////////////////////////////END OF LIFECYCLE HOOKS////////////////////////////


  private isMobileDevice(): boolean {
    return (typeof window.orientation !== 'undefined') || (navigator.userAgent.indexOf('IEMobile') !== -1);
  }







  ////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////EVENT HANDLERS/////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  public onMouseWheel(e: any): void {
    // log.debug('OnMouseWheel() e:', e);
    setTimeout( () => { // make the operation async so we can improve speed of change detection

      let event = e.event;
      let deltaY = e.deltaY;

      if (this.config.zoomOnMouseWheel) {
        event.preventDefault();

        if (this.zoomAnimation) {
          return; // already zooming
        }

        let sign = math.eval(`${deltaY} / ${math.abs(deltaY)}`);

        if (this.config.invertMouseWheel) {
          sign = -sign;
        }

        let clickPoint: Point = {
          x: math.eval(`${event.originalEvent.pageX} - ${this.frameElement.offset().left}`),
          y: math.eval(`${event.originalEvent.pageY} - ${this.frameElement.offset().top}`)
        };

        /*this.previousPosition = {
          x: event.originalEvent.pageX,
          y: event.originalEvent.pageY
        };*/

        // log.debug("clickPoint:", clickPoint);

        if (!this.config.freeMouseWheel) {
          if (sign < 0) {
            this.zoomIn(clickPoint);
          }
          else if (sign > 0) {
            this.zoomOut(clickPoint);
          }
        }
        else {
          // free wheel scroll
          this.freeZoom(clickPoint, deltaY);
        }
      }
    }, 0);
  }



  public onDblClick(event: any) {
    // log.debug("onDblClick()");
    if (this.config.zoomOnDoubleClick) {
      let clickPoint: Point = {
        x: math.eval(`${event.pageX} - ${this.frameElement.offset().left}`),
        y: math.eval(`${event.pageY} - ${this.frameElement.offset().top}`)
      };
      this.zoomIn(clickPoint);
    }
    // this.viewChangedEmitter.emit();
  }


  public onMousedown(event: any) {
    // log.debug("onMousedown()", event);

    if (event.button === 0 || event.type === 'touchstart') {
      if (this.config.panOnClickDrag) {
        this.previousPosition = {
          x: event.pageX,
          y: event.pageY
        };
        this.lastMouseEventTime = (new Date).getTime();
        this.dragging = true;
        this.model.isPanning = false;

        if (!this.isMobile) {
          // this.onMouseMoveRemoveFunc = this.renderer.listen('document', 'mousemove', (e: any) => this.onMouseMove(e) );
          this.onMouseMoveRemoveFunc = this.renderer.listen(this.frameElementRef.nativeElement, 'mousemove', (e: any) => this.onMouseMove(e) );
          // this.onMouseUpRemoveFunc = this.renderer.listen('document', 'mouseup', () => this.onMouseUp() );
          this.onMouseUpRemoveFunc = this.renderer.listen(this.frameElementRef.nativeElement, 'mouseup', () => this.onMouseUp() );
        }
        else {
          // this.onTouchEndRemoveFunc = this.renderer.listen(this.element, 'touchend', (e: any) => this.onTouchEnd(e));
          this.onTouchEndRemoveFunc = this.renderer.listen(this.frameElementRef.nativeElement, 'touchend', (e: any) => this.onTouchEnd(e));
          // this.onTouchMoveRemoveFunc = this.renderer.listen(this.element, 'touchmove', (e: any) => this.onTouchMove(e));
          this.onTouchMoveRemoveFunc = this.renderer.listen(this.frameElementRef.nativeElement, 'touchmove', (e: any) => this.onTouchMove(e));
        }
      }

      return false;
    }
  }


  private onMouseMove(event: any) {
    // Called when moving the mouse with the left button down
    // log.debug(`onMouseMove()`);
    event.preventDefault();
    event.stopPropagation();

    // log.debug(`onMouseMove(): pageX: ${event.pageX} pageY: ${event.pageY}`);
    // log.debug(`onMouseMove(): base.pan.x: ${this.base.pan.x} base.pan.y: ${this.base.pan.y}`);

    let now = (new Date).getTime();
    let timeSinceLastMouseEvent = math.eval(`(${now} - ${this.lastMouseEventTime}) / 1000`);
    this.lastMouseEventTime = now;
    let dragDelta = {
      // a representation of how far each coordinate has moved since the last time it was moved
      x: math.eval(`${event.pageX} - ${this.previousPosition.x}`),
      y: math.eval(`${event.pageY} - ${this.previousPosition.y}`)
    };

    if (this.config.keepInBounds) {
      let topLeftCornerView = this.getViewPosition( { x: 0, y: 0 } );
      let bottomRightCornerView = this.getViewPosition( { x: this.viewportWidth, y: this.viewportHeight } );

      if (topLeftCornerView.x > 0 && dragDelta.x > 0) {
        dragDelta.x *= math.min(math.pow(topLeftCornerView.x, -this.config.keepInBoundsDragPullback), 1);
      }

      if (topLeftCornerView.y > 0 && dragDelta.y > 0) {
        dragDelta.y *= math.min(math.pow(topLeftCornerView.y, -this.config.keepInBoundsDragPullback), 1);
      }

      if (bottomRightCornerView.x < this.viewportWidth && dragDelta.x < 0) {
        dragDelta.x *= math.min(math.pow(this.viewportWidth - bottomRightCornerView.x, -this.config.keepInBoundsDragPullback), 1);
      }

      if (bottomRightCornerView.y < this.viewportHeight && dragDelta.y < 0) {
        dragDelta.y *= math.min(math.pow(this.viewportHeight - bottomRightCornerView.y, -this.config.keepInBoundsDragPullback), 1);
      }
    }

    this.pan(dragDelta);
    this.zone.runOutsideAngular( () => this.animationId = this.animationFrame(this.animationTick) );

    if (!this.model.isPanning) {
      // This will improve the performance,
      // because the browser stops evaluating hits against the elements displayed inside the pan zoom view.
      // Besides this, mouse events will not be sent to any other elements,
      // this prevents issues like selecting elements while dragging.
      this.renderer.setStyle(this.panzoomOverlay, 'display', 'block');
    }

    this.model.isPanning = true;

    // set these for the animation slow down once drag stops
    this.panVelocity = {
      x: math.eval(`${dragDelta.x} / ${timeSinceLastMouseEvent}`),
      y: math.eval(`${dragDelta.y} / ${timeSinceLastMouseEvent}`)
    };

    this.previousPosition = {
      x: event.pageX,
      y: event.pageY
    };

  }


  private onMouseUp() {
    // log.debug("onMouseup()");
    let now = (new Date).getTime();
    let timeSinceLastMouseEvent = (now - this.lastMouseEventTime) / 1000;

    if (this.panVelocity) {
      // apply strong initial dampening if the mouse up occured much later than
      // the last mouse move, indicating that the mouse hasn't moved recently
      // TBD experiment with this formula
      let initialMultiplier = math.max(0, <number>math.pow(timeSinceLastMouseEvent + 1, -4) - 0.2);

      this.panVelocity.x *= initialMultiplier;
      this.panVelocity.y *= initialMultiplier;
    }

    this.dragging = false;
    this.model.isPanning = false;

    if (!this.isMobile) {
      this.onMouseMoveRemoveFunc();
      this.onMouseUpRemoveFunc();
    }
    else {
      this.onTouchEndRemoveFunc();
      this.onTouchMoveRemoveFunc();
    }

    // Set the overlay to non-blocking again:
    this.renderer.setStyle(this.panzoomOverlay, 'display', 'none');
  }


  private onTouchStart(event: any) {
    // log.debug("onTouchStart()", event);
    event.preventDefault();

    if (event.touches.length === 1) {
      // single touch, get ready for panning
      this.onMousedown(event);
    }
    else {
      // multiple touches, get ready for zooming

      // Calculate x and y distance between touch events
      let x = math.eval(`${event.touches[0].pageX} - ${event.touches[1].pageX}`);
      let y = math.eval(`${event.touches[0].pageY} - ${event.touches[1].pageY}`);

      // Calculate length between touch points with pythagoras
      // There is no reason to use Math.pow and Math.sqrt as we
      // only want a relative length and not the exact one.
      this.previousPosition = {
        length: math.eval(`${x} * ${x} + ${y} * ${y}`)
      };
    }
  }


  private onTouchMove(event: any) {
    // log.debug("onTouchMove()");
    event.preventDefault();

    if (event.touches.length === 1) {
      // single touch, emulate mouse move
      this.onMouseMove(event);
    }
    else {
      // multiple touches, zoom in/out

      // Calculate x and y distance between touch events
      let x = event.touches[0].pageX - event.touches[1].pageX;
      let y = event.touches[0].pageY - event.touches[1].pageY;
      // Calculate length between touch points with pythagoras
      // There is no reason to use Math.pow and Math.sqrt as we
      // only want a relative length and not the exact one.
      let length = x * x + y * y;

      // Calculate delta between current position and last position
      let delta = length - this.previousPosition.length;

      // Naive hysteresis
      if (math.abs(delta) < 100) {
        return;
      }

      // Calculate center between touch points
      let centerX = math.eval(`${event.touches[1].pageX} + ${x} / 2`);
      let centerY = math.eval(`${event.touches[1].pageY} + ${y} / 2`);

      // Calculate zoom center
      let clickPoint = {
        x: math.eval(`${centerX} - ${this.frameElement.offset().left}`),
        y: math.eval(`${centerY} - ${this.frameElement.offset().top}`)
      };

      this.changeZoomLevel( math.eval(`${this.base.zoomLevel} + ${delta} * 0.0001`), clickPoint);

      // Update length for next move event
      this.previousPosition = {
        length: length
      };
    }
  }


  private onTouchEnd(event: any) {
    // log.debug("onTouchEnd()");
    this.onMouseUp();
  }



  private onMouseleave() {
    // log.debug("onMouseleave()");
    this.onMouseUp(); // same behaviour
  }








  private pan(delta: Point): void {
    // log.debug('pan()');
    delta.x = delta.x || 0;
    delta.y = delta.y || 0;
    this.base.pan.x += delta.x;
    this.base.pan.y += delta.y;
    this.syncModelToDOM();
    // this.config.modelChanged.next(this.model);
  }


  private animationTick = (timestamp: any) => {
    // this.renderer.setStyle(this.zoomElement, 'will-change', 'auto');
    // log.debug('PanZoomComponent: tick()');
    let deltaTime = math.chain(timestamp)
                        .subtract(this.lastTick)
                        .divide(1000)
                        .done();
    this.lastTick = timestamp;

    if (this.zoomAnimation) {
      // when we're zooming
      // log.debug('zoomAnimation: model is zooming');
      /*if (this.chrome) {
        this.renderer.setStyle(this.zoomElement, 'will-change', 'transform');
      }*/
      // this.renderer.removeStyle(this.zoomElement, 'will-change');
      this.zoomAnimation.progress += deltaTime / this.zoomAnimation.duration;

      if (this.zoomAnimation.progress >= 1.0) {
        // when the zoom has finished
        this.zoomAnimation.progress = 1.0;
        this.syncModelToDOM();
        this.base.zoomLevel = this.model.zoomLevel;
        this.base.pan.x = this.model.pan.x;
        this.base.pan.y = this.model.pan.y;
        this.zoomAnimation = null;
        this.config.modelChanged.next(this.model);
        if (this.config.freeMouseWheel) {
          this.scale = this.getCssScale(this.base.zoomLevel);
        }
      }
    }

    if (this.panVelocity && !this.dragging) {
      // this is when we've panned and released the mouse button and the view is "free-floating" until it slows to a stop
      // prevent overshooting if delta time is large for some reason. We apply the simple solution of
      // slicing delta time into smaller pieces and applying each one
      while (deltaTime > 0) {
        let dTime = math.min(0.02, deltaTime);

        deltaTime = math.chain(deltaTime)
                        .subtract(dTime)
                        .done();

        this.base.pan.x = math.chain(this.panVelocity.x)
                              .multiply(dTime)
                              .add(this.base.pan.x)
                              .done();

        this.panVelocity.x = math.eval(`(1 - ${this.config.friction} * ${dTime}) * ${this.panVelocity.x}`);

        this.base.pan.y = math.chain(this.panVelocity.y)
                              .multiply(dTime)
                              .add(this.base.pan.y)
                              .done();

        this.panVelocity.y = math.eval(`(1 - ${this.config.friction} * ${dTime}) * ${this.panVelocity.y}`);

        let speed = this.length(this.panVelocity);

        if (speed < this.config.haltSpeed) {
          this.panVelocity = null;
          this.config.modelChanged.next(this.base);
          break;
        }
      }
      // log.debug(`baseAfterDrag: x: ${this.base.pan.x} y: ${this.base.pan.y} zoomlevel: ${this.base.zoomLevel}` );
    }

    if (this.config.keepInBounds && !this.dragging) {
      let topLeftCornerView = this.getViewPosition({ x: 0, y: 0 });
      let bottomRightCornerView = this.getViewPosition({ x: this.viewportWidth, y: this.viewportHeight });

      if (topLeftCornerView.x > 0) {
        this.base.pan.x -= this.config.keepInBoundsRestoreForce * topLeftCornerView.x;
      }

      if (topLeftCornerView.y > 0) {
        this.base.pan.y -= this.config.keepInBoundsRestoreForce * topLeftCornerView.y;
      }

      if (bottomRightCornerView.x < this.viewportWidth) {
        this.base.pan.x -= this.config.keepInBoundsRestoreForce * (bottomRightCornerView.x - this.viewportWidth);
      }

      if (bottomRightCornerView.y < this.viewportHeight) {
        this.base.pan.y -= this.config.keepInBoundsRestoreForce * (bottomRightCornerView.y - this.viewportHeight);
      }
    }

    this.syncModelToDOM();

    if (this.dragging) {
      this.config.modelChanged.next(this.base);
    }

    // this.renderer.setStyle(this.zoomElement, 'will-change', 'transform');
    /*if (this.chrome) {
      this.renderer.removeStyle(this.zoomElement, 'will-change');
    }*/

    if ( this.animationFrame && !this.scopeIsDestroyed && ( this.zoomAnimation || this.panVelocity ) ) {
      // console.log(`zoomAnimation: ${this.zoomAnimation}, panVelocity: ${this.panVelocity}`);
      this.animationFrame(this.animationTick); // Call the next frame, but only if we're zooming or panning
    }

  }


  private syncModelToDOM() {
    // log.debug('syncModelToDOM()');

    if (!this.zoomAnimation) {
      // Just panning.  No zoom
      // sync base to model
      this.model.zoomLevel = this.base.zoomLevel;
      this.model.pan.x = this.base.pan.x;
      this.model.pan.y = this.base.pan.y;
    }
    else {
      // we're zooming
      this.model.zoomLevel = this.base.zoomLevel + this.zoomAnimation.deltaZoomLevel * this.zoomAnimation.progress; // calculate how far we need to zoom in for the current animationTick
      let deltaT = this.zoomAnimation.translationFromZoom(this.model.zoomLevel); // calculate how far to pan the view to based on our translated coordinates
      this.model.pan = {
        // sync the model pan coordinates to our translated pan coordinates
        // we do this by adding how far we want to move in each direction to our our existing base pan coordinates (where we started)
        x: this.base.pan.x + deltaT.x,
        y: this.base.pan.y + deltaT.y
      };

      if (this.config.keepInBounds) {
        let topLeftCornerView = this.getViewPosition({ x: 0, y: 0 });
        let bottomRightCornerView = this.getViewPosition({ x: this.viewportWidth, y: this.viewportHeight });

        if (topLeftCornerView.x > 0) {
          this.model.pan.x = 0;
        }

        if (topLeftCornerView.y > 0) {
          this.model.pan.y = 0;
        }

        if (bottomRightCornerView.x < this.viewportWidth) {
          this.model.pan.x -= (bottomRightCornerView.x - this.viewportWidth);
        }

        if (bottomRightCornerView.y < this.viewportHeight) {
          this.model.pan.y -= (bottomRightCornerView.y - this.viewportHeight);
        }
      }
    }

    /////////////////////////////////////////////
    ////////////////APPLY SCALING////////////////
    /////////////////////////////////////////////
    if (this.zoomAnimation || this.zoomingToFit) {
      let scale = this.getCssScale(this.model.zoomLevel);
      let scaleString = 'scale3d(' + scale + ', ' + scale + ', ' + scale + ')';
      if (this.chrome) {
        // Chrome scaling
        // For Chrome, use the zoom style by default, as it doesn't handle nested SVG very well when using transform
        if ( this.config.chromeUseTransform ) {
          // example: scale(0.8218728816747501)
          // example1: -webkit-transform: scale(0.8218728816747501)
          this.zoomElement.style.webkitTransformOrigin = '0 0';
          this.zoomElement.style.webkitTransform = scaleString;
        }
        else {
          // http://caniuse.com/#search=zoom
          this.zoomElement.style.zoom = scale.toString();
        }
      }
      else {
        // Not Chrome
        // http://caniuse.com/#search=transform

        // Firefox
        (<any>this.zoomElement.style).MozTransformOrigin = '0 0';
        (<any>this.zoomElement.style).MozTransform = scaleString;

        // Other webkit browsers: Safari etc...
        this.zoomElement.style.webkitTransformOrigin = '0 0';
        this.zoomElement.style.webkitTransform = scaleString;

        // IE 9.0
        // Special handling of IE, as it doesn't support the zoom style
        this.renderer.setStyle(this.zoomElement, '-ms-transform-origin', '0 0');
        this.renderer.setStyle(this.zoomElement, '-ms-transform', scaleString);
        // this.zoomElement.style.msTransformOrigin = '0 0';
        // this.zoomElement.style.msTransform = scaleString;

        // IE > 9.0
        this.zoomElement.style.transformOrigin = '0 0';
        this.zoomElement.style.transform = scaleString;
      }
    }

    ////////////////////////////////////////////////////
    ////////////////APPLY PAN ANIMATION/////////////////
    ////////////////////////////////////////////////////
    if (this.config.useHardwareAcceleration) {
      let translate3d = 'translate3d(' + this.model.pan.x + 'px, ' + this.model.pan.y + 'px, 0)';
      // this.zoomElement.style.webkitTransformOrigin = this.base.pan.x + ' ' + this.base.pan.y;
      this.panElement.style.webkitTransform = translate3d;
      (<any>this.panElement.style).MozTransform = translate3d;
      this.panElement.style.transform = translate3d;
      this.renderer.setStyle(this.panElement, '-ms-transform', translate3d);
    }
    else {
      this.panElement.style.left = this.model.pan.x + 'px';
      this.panElement.style.top = this.model.pan.y + 'px';
    }
  }


  private getModelPosition(viewPosition: any) {
    // log.debug("getModelPosition()");
    // p = (1/s)(p' - t)
    let pmark = viewPosition;
    let s = this.getCssScale(this.base.zoomLevel);
    let t = this.base.pan;

    return {
      x: (1 / s) * (pmark.x - t.x),
      y: (1 / s) * (pmark.y - t.y)
    };
  }


  private zoomToFit(rectangle: Rect) {
    // presumably, when a user clicks a zoom to fit button
    // log.debug("zoomToFit()", rectangle);
    // example rectangle: { "x": 0, "y": 100, "width": 100, "height": 100 }
    // log.debug('zoomToFit(): rectangle', rectangle);
    this.base = this.calcZoomToFit(rectangle);
    if (this.config.freeMouseWheel) {
      this.scale = this.getCssScale(this.base.zoomLevel);
    }
    this.zoomingToFit = true;
    this.syncModelToDOM();
    this.zoomingToFit = false;
  }


  private length(vector2d: any) {
    // log.debug("length()");
    return math.sqrt(vector2d.x * vector2d.x + vector2d.y * vector2d.y);
  }


  private getCenterPoint(): Point {
    // log.debug("getCenterPoint()");
    let center = {
      // x: this.frameElement.width() / 2,
      x: this.frameElementRef.nativeElement.offsetWidth / 2,
      // y: this.frameElement.height() / 2
      y: this.frameElementRef.nativeElement.offsetHeight / 2
    };
    return center;
  }


  private getViewPosition(modelPosition: Point) {
    // log.debug("getViewPosition()");
    //  p' = p * s + t
    let p = modelPosition;
    let s = this.getCssScale(this.base.zoomLevel);
    let t = this.base.pan;

    if (this.zoomAnimation) {
      s = this.getCssScale(this.base.zoomLevel + this.zoomAnimation.deltaZoomLevel * this.zoomAnimation.progress);
      let deltaT = this.zoomAnimation.translationFromZoom(this.model.zoomLevel);
      t = { x: this.base.pan.x + deltaT.x, y: this.base.pan.y + deltaT.y };
    }

    return {
      x: p.x * s + t.x,
      y: p.y * s + t.y
    };
  }


  private getCssScale(zoomLevel: any): number {
    // log.debug("getCssScale()");
    return <number>math.pow(this.config.scalePerZoomLevel, zoomLevel - this.config.neutralZoomLevel);
  }


  private getZoomLevel(cssScale: any) {
    // log.debug("getZoomLevel()");
    return math.log10(cssScale) / math.log10(this.config.scalePerZoomLevel) + this.config.neutralZoomLevel;
  }


  private calcZoomToFit(rect: Rect): PanZoomModel {
    // log.debug("calcZoomToFit()");
    // let (W, H) denote the size of the viewport
    // let (w, h) denote the size of the rectangle to zoom to
    // then we must CSS scale by the min of W/w and H/h in order to just fit the rectangle

    let W = this.frameElementRef.nativeElement.offsetWidth;
    let H = this.frameElementRef.nativeElement.offsetHeight;

    let w = rect.width;
    let h = rect.height;

    let cssScaleExact = math.min( math.eval(`${W} / ${w}`), math.eval(`${H} / ${h}`) );
    let zoomLevelExact = this.getZoomLevel(cssScaleExact);
    let zoomLevel = zoomLevelExact * this.config.zoomToFitZoomLevelFactor;
    let cssScale = this.getCssScale(zoomLevel);

    // log.debug('cssScaleExact:', cssScaleExact);
    // log.debug('cssScale:', cssScale);
    // log.debug('zoomLevel:', zoomLevel);

    return {
        zoomLevel: zoomLevel,
        pan: {
            x: math.eval(`${-rect.x} * ${cssScale} + (${W} - ${w} * ${cssScale}) / 2`),
            y: math.eval(`${-rect.y} * ${cssScale} + (${H} - ${h} * ${cssScale}) / 2`)
        }
    };
  }


  private freeZoomOld(clickPoint: Point, wheelDelta: number): void {
    // log.debug(wheelDelta);
    // log.debug('freeZoom(): this.base:', this.base);
    // log.debug(`baseBeforeZoom: x: ${this.base.pan.x} y: ${this.base.pan.y} zoomlevel: ${this.base.zoomLevel}` );

    // wheelDelta = math.max(-1, math.min(1, wheelDelta)); // cap the delta to [-1,1] for cross browser consistency

    // determine the point on where the slide is zoomed in
    /*let zoomTarget: Point = {
      x: ( clickPoint.x - this.base.pan.x ) / this.scale,
      y: ( clickPoint.y - this.base.pan.y ) / this.scale,
    };*/
    let zoomTarget: Point = {
      x: math.eval( ` ( ${clickPoint.x} - ${this.base.pan.x} ) / ${this.scale}` ),
      y: math.eval( ` ( ${clickPoint.y} - ${this.base.pan.y} ) / ${this.scale}` ),
    };

    // this.scale += wheelDelta * this.factor * this.scale;
    this.scale = math.chain(wheelDelta)
                      .multiply(this.config.freeMouseWheelFactor)
                      .multiply(this.scale)
                      .add(this.scale)
                      .done();

    this.scale = math.max(this.minScale, math.min( this.maxScale, this.scale ));

    // calculate x and y based on zoom
    // this.base.pan.x = -zoomTarget.x * this.scale + clickPoint.x;
    this.base.pan.x = math.chain(-zoomTarget.x)
                          .multiply(this.scale)
                          .add(clickPoint.x)
                          .done();

    // this.base.pan.y = -zoomTarget.y * this.scale + clickPoint.y;
    this.base.pan.y = math.chain(-zoomTarget.y)
                          .multiply(this.scale)
                          .add(clickPoint.y)
                          .done();

    // Apply Scale
    let scaleString = 'scale3d(' + this.scale + ', ' + this.scale + ', ' + this.scale + ')';
    this.zoomElement.style.webkitTransformOrigin = '0 0';
    this.zoomElement.style.webkitTransform = scaleString;

    // Apply Pan
    let translate3d = 'translate3d(' + this.base.pan.x + 'px, ' + this.base.pan.y + 'px, 0)';
    // this.panElement.style.webkitTransformOrigin = '0 0';
    this.panElement.style.webkitTransform = translate3d;

    this.base.zoomLevel = this.getZoomLevel(this.scale);
    this.config.modelChanged.next(this.base);
    // log.debug(`baseAfterZoom: x: ${this.base.pan.x} y: ${this.base.pan.y} zoomlevel: ${this.base.zoomLevel}` );
  }


  private freeZoom(clickPoint: Point, wheelDelta: number): void {
    // log.debug(wheelDelta);
    // log.debug('freeZoom(): this.base:', this.base);
    // log.debug(`baseBeforeZoom: x: ${this.base.pan.x} y: ${this.base.pan.y} zoomlevel: ${this.base.zoomLevel}` );

    // wheelDelta = math.max(-1, math.min(1, wheelDelta)); // cap the delta to [-1,1] for cross browser consistency

    let t0: Point = {
      // the current base coordinates
      x: this.base.pan.x,
      y: this.base.pan.y
    };
    let s0 = this.scale; // get the current CSS scale (scale0)
    let pmark = clickPoint; // the point we are aiming to zoom to

    // this.scale += wheelDelta * this.factor * this.scale;
    let s1 = math.chain(wheelDelta)
                      .multiply(this.config.freeMouseWheelFactor)
                      .multiply(this.scale)
                      .add(this.scale)
                      .done();

    s1 = math.max(this.minScale, math.min( this.maxScale, s1 ));
    this.scale = s1;
    // log.debug('scale:', this.scale);

    let t1: Point = {
      // The target point to zoom to.  It must stay the same as the untranslated point
      // x: pmark.x - (s1 / s0) * (pmark.x - t0.x),
      // y: pmark.y - (s1 / s0) * (pmark.y - t0.y)
      x: math.eval(`${pmark.x} - (${s1} / ${s0}) * (${pmark.x} - ${t0.x})`),
      y: math.eval(`${pmark.y} - (${s1} / ${s0}) * (${pmark.y} - ${t0.y})`)
    };

    // Apply Scale
    let scaleString = 'scale3d(' + this.scale + ', ' + this.scale + ', ' + this.scale + ')';
    this.zoomElement.style.webkitTransformOrigin = '0 0';
    this.zoomElement.style.webkitTransform = scaleString;

    // Apply Pan
    // this.panElement.style.webkitTransformOrigin = `${t0.x} ${t0.y}`;
    let translate3d = 'translate3d(' + t1.x + 'px, ' + t1.y + 'px, 0)';
    // this.panElement.style.webkitTransformOrigin = '0 0';
    this.panElement.style.webkitTransform = translate3d;


    this.base.pan = t1;
    this.base.zoomLevel = this.getZoomLevel(this.scale);
    this.config.modelChanged.next(this.base);
    // log.debug(`baseAfterZoom: x: ${this.base.pan.x} y: ${this.base.pan.y} zoomlevel: ${this.base.zoomLevel}` );
  }


  private zoomIn(clickPoint: Point) {
    // log.debug('zoomIn(): clickPoint:', clickPoint);
    this.lastTick = performance.now();
    this.changeZoomLevel( this.base.zoomLevel + this.config.zoomButtonIncrement, clickPoint );
    this.zone.runOutsideAngular( () => this.animationId = this.animationFrame(this.animationTick) );
    if (this.config.freeMouseWheel) {
      this.scale = this.getCssScale(this.base.zoomLevel);
    }
  }

  private zoomOut(clickPoint: Point) {
    // log.debug('zoomOut()');
    this.lastTick = performance.now();
    this.changeZoomLevel( this.base.zoomLevel - this.config.zoomButtonIncrement, clickPoint );
    this.zone.runOutsideAngular( () => this.animationId = this.animationFrame(this.animationTick) );
    if (this.config.freeMouseWheel) {
      this.scale = this.getCssScale(this.base.zoomLevel);
    }
  }

  private changeZoomLevel(newZoomLevel: number, clickPoint: Point) {
    // log.debug("changeZoomLevel()");

    if (this.zoomAnimation) {
      // cancel any existing zoom animation (if they pressed a zoom button - this shouldn't ever happen on mousewheel)
      this.base.zoomLevel = this.model.zoomLevel;
      this.base.pan.x = this.model.pan.x;
      this.base.pan.y = this.model.pan.y;
      this.zoomAnimation = null;
    }

    // keep zoom level in bounds
    let minimumAllowedZoomLevel = this.config.keepInBounds ? this.config.neutralZoomLevel : 0;
    newZoomLevel = math.max(minimumAllowedZoomLevel, newZoomLevel);
    newZoomLevel = math.min(this.config.zoomLevels - 1, newZoomLevel);
    // log.debug('newZoomLevel:', newZoomLevel);

    let deltaZoomLevel = newZoomLevel - this.base.zoomLevel; // deltaZoomLevel is the number of zoom levels we are changing here
    if (!deltaZoomLevel) {
      // a deltaZoomLevel of zero means that we aren't changing zoom, because we're either zoomed all the way in or all the way out
      return;
    }

    //
    // Let p be the vector to the clicked point in view coords and let p' be the same point in model coords. Let s be a scale factor
    // and let t be a translation vector. Let the transformation be defined as:
    //
    //  p' = p * s + t
    //
    // And conversely:
    //
    //  p = (1/s)(p' - t)
    //
    // Now use subscription 0 to denote the value before transform and zoom and let 1 denote the value after transform. Scale
    // changes from s0 to s1. Translation changes from t0 to t1. But keep p and p' fixed so that the view coordinate p' still
    // corresponds to the model coordinate p. This can be expressed as an equation relying upon solely upon p', s0, s1, t0, and t1:
    //
    //  (1/s0)(p - t0) = (1/s1)(p - t1)
    //
    // Every variable but t1 is known, thus it is easily isolated to:
    //
    //  t1 = p' - (s1/s0)*(p' - t0)
    //

    let t0: Point = {
      // the current base coordinates
      x: this.base.pan.x,
      y: this.base.pan.y
    };
    let s0 = this.getCssScale(this.base.zoomLevel); // get the current CSS scale (scale0)
    let pmark = clickPoint || this.getCenterPoint(); // the point we are aiming to zoom to (either the click point or the centre of the page)


    let translationFromZoom = (zoomLevel: number) => {
      // this function gets called during every animation tick, to calculate where to move the model pan coordinates to (i.e. the translation) for that tick,
      // where zoomLevel is calculated from the current zoomLevel + the target zoomLevel * the progress of the current animation
      let s1 = this.getCssScale(zoomLevel); // the scale to translate to for the current animation tick
      let t1: Point = {
        // The target point to zoom to.  It must stay the same as the untranslated point
        // x: pmark.x - (s1 / s0) * (pmark.x - t0.x),
        // y: pmark.y - (s1 / s0) * (pmark.y - t0.y)
        x: math.eval(`${pmark.x} - (${s1} / ${s0}) * (${pmark.x} - ${t0.x})`),
        y: math.eval(`${pmark.y} - (${s1} / ${s0}) * (${pmark.y} - ${t0.y})`)
      };

      return {
        // now return the difference between our initial click point and our translated (zoomed) click point
        // these are not absolute coordinates - just how far to move them
        // x: t1.x - t0.x,
        // y: t1.y - t0.y
        x: math.chain(t1.x).subtract(t0.x).done(),
        y: math.chain(t1.y).subtract(t0.y).done()
      };
    };

    // now rewind to the start of the anim and let it run its course
    this.zoomAnimation = {
      deltaZoomLevel: deltaZoomLevel, // the destination zoom level for this zoom operation (when the animation is completed)
      translationFromZoom: translationFromZoom,
      duration: this.config.zoomStepDuration, // how long the animation should take
      progress: this.config.disableZoomAnimation ? 1.0 : 0.0 // If zoom animation is disabled set progress to the finished point so that the animation completes on the first tick
    };

  }


}

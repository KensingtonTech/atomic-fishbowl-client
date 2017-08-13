import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, AfterContentInit, OnDestroy, ElementRef, ViewChild, Input, Renderer, NgZone, AfterViewChecked } from '@angular/core';
import { PanZoomApiService } from './panzoom-api.service';
import { PanZoomConfigService } from './panzoom-config.service';
import { PanZoomModelService } from './panzoom-model.service';
import { WindowRefService } from './panzoom-windowref.service';
declare var log: any;

@Component( {
  selector: 'panzoom',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div #panzoomElement class="pan-zoom-frame" (dblclick)="onDblClick($event)" (mousedown)="onMousedown($event)" (kwheel)="onMouseWheel($event)"  style="position:relative; overflow: hidden;">
  <div #panElement style="position: absolute; left: 0px; top: 0px;">
    <div #zoomElement class="" style="will-change: transform;">
      <ng-content></ng-content>
    </div>
  </div>
</div>
<div #panzoomOverlay style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; display: none;"></div>
  `,

/*can't use angular 2 animations yet as you insanely can't bind an value to a class property.  https://github.com/angular/angular/issues/9668
  animations: [
    trigger('zoomAnimationTrigger', [
      state('zoomDestination', style({ transform: 0 })),
//      state('enabled',  style({ opacity: 1, display: 'block' })),
      transition('* => *', animate('.2s')),
    ])
  ],
*/

  styles: [`
    .zoom-element {
      -webkit-transform: translateZ(0);
      -moz-transform: translateZ(0);
      -ms-transform: translateZ(0);
      -o-transform: translateZ(0);
      transform: translateZ(0);
    }
  `]

/*
      -webkit-backface-visibility: hidden;
      -webkit-perspective: 1000;
      -webkit-transform: translate3d(0,0,0);
*/
/*
  styles: [`
    .zoom-element {
      -webkit-transform: transale3d(0,0,0);
      -moz-transform: transale3d(0,0,0);
      -ms-transform: transale3d(0,0,0);
      -o-transform: transale3d(0,0,0);
      transform: transale3d(0,0,0);
    }
  `]
*/

} )

export class PanZoomComponent implements OnInit, AfterContentInit, OnDestroy {

  constructor ( private panZoomApiService: PanZoomApiService,
                private config: PanZoomConfigService,
                private el: ElementRef,
                private windowRef: WindowRefService,
                private renderer: Renderer,
                private modelService: PanZoomModelService,
                private _changeDetectionRef: ChangeDetectorRef,
                private zone: NgZone )
    {
      this.element = el.nativeElement;
      this.window = this.windowRef.nativeWindow;
      this.model = this.modelService.model;
    }

  @ViewChild('panElement') panElementRef: ElementRef;
  @ViewChild('zoomElement') zoomElementRef: ElementRef;
  @ViewChild('panzoomElement') frameElementRef: ElementRef;
  @ViewChild('panzoomOverlay') panzoomOverlayRef: ElementRef;
  @Input() id: string;
  @Input() addStyle: string; // gets appended to style attribute of div.#panzoomElement

  $document: any;
  api: any;
  viewportHeight: any;
  viewportWidth: any;
  lastMouseEventTime: any;
  base: any;
  previousPosition: any = undefined;
  scopeIsDestroyed = false;
  dragging = false;
  panVelocity: any = undefined;
  zoomAnimation: any = undefined;
  element: any;
  jElement: any;
  window: any;
  model: any;
  tick: any;
  frameElement: any;
  panElement: any;
  zoomElement: any;
  panElementDOM: any;
  zoomElementDOM: any;
  animationFrame: any;
  panzoomOverlay: any;
  onMouseMoveRemoveFunc: Function;
  onMouseUpRemoveFunc: Function;
  onTouchEndRemoveFunc: Function;
  onTouchMoveRemoveFunc: Function;
  hasPanned: boolean;

  ngOnInit(): void {
    log.debug('ngOnInit(): initializing PanZoomComponent');
    let frameStyle = this.frameElementRef.nativeElement.attributes.style.value;
    this.renderer.setElementAttribute(this.frameElementRef.nativeElement, 'style', frameStyle + this.addStyle);

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
    this.model.zoomLevel = this.base.zoomLevel;

    // Only true if panning has actually taken place, not just after mousedown
    this.model.isPanning = false;
    this.model.pan = {
      x: this.base.pan.x,
      y: this.base.pan.y
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
    if (this.id) {
      this.panZoomApiService.registerAPI(this.id, this.api);
    }

  }

  ngAfterContentInit(): void {
    // log.debug("ngAfterContentInit()");

    this.$document = $(this.window.document);
    this.jElement = this.$document.find('.pan-zoom-frame');

    this.viewportHeight = this.jElement.find('.zoom-element').children().height();
    this.viewportWidth = this.jElement.find('.zoom-element').children().width();


    this.renderer.listen(this.element, 'touchstart', ($event: any) => this.onTouchStart($event) );
    this.panElement = this.panElementRef.nativeElement;
    this.zoomElement = this.zoomElementRef.nativeElement;
    this.panzoomOverlay = this.panzoomOverlayRef.nativeElement;
    this.frameElement = this.jElement;
    this.animationFrame =   window.requestAnimationFrame ||
                            (<any>window).webkitRequestAnimationFrame ||
                            (<any>window).mozRequestAnimationFrame ||
                            (<any>window).oRequestAnimationFrame ||
                            (<any>window).msRequestAnimationFrame;


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

    // I *THINK* this goes in ngAfterViewInit.  Will check back
    this.syncModelToDOM();


    this.zone.runOutsideAngular( () => {
      this.tick = new (<any>this.AnimationTick()).bind(this);
      // this.tick = new (<any>this.AnimationTick()).bind(this);
      if (this.animationFrame) {
        // log.debug('Got animation frame');
        this.animationFrame(this.tick);
      }
      else {
        // tslint:disable-next-line:quotemark
        log.debug("Didn't get animation frame.  Reverting to jquery");
        (<any>$.fx).timer(this.tick);
      }
    });
    // this.$document.find('.cdk-overlay-pane ').css('pointer-events', 'none'); //allow pointer events to propagate through the overlay divs
    this.renderer.setElementStyle(this.panzoomOverlay, 'pointer-events', 'none');
  }

  ngOnDestroy(): void {
    log.debug('ngOnDestroy()');
    this.panZoomApiService.unregisterAPI(this.id);
    this.scopeIsDestroyed = true;
  }


////////////////////////////END OF LIFECYCLE HOOKS////////////////////////////


  onMouseWheel(e: any): void {
    // log.debug("OnMouseWheel()");
    // unpack '$event' passed in as 'e' as Angular 2 doesn't support multiple output params
    let $event = e.event;
    let $delta = e.delta;
    let $deltaX = e.deltaX;
    let $deltaY = e.deltaY;

    if (this.config.zoomOnMouseWheel) {
      $event.preventDefault();

      if (this.zoomAnimation) {
        return; // already zooming
      }

      let sign = $deltaY / Math.abs($deltaY);

      if (this.config.invertMouseWheel) {
        sign = -sign;
      }

      let clickPoint = {
        x: $event.originalEvent.pageX - this.frameElement.offset().left,
        y: $event.originalEvent.pageY - this.frameElement.offset().top
      };

      // log.debug("clickPoint:", clickPoint);

      if (sign < 0) {
        this.zoomIn(clickPoint);
  /*
        $(".zoom-element").animate({ whyNotToUseANonExistingProperty: 100 }, {
              step: function(now,fx) {
                  $(".zoom-element").css('-webkit-transform-origin', originStr);
                  $(".zoom-element").css('-webkit-transform', 'scale(1.1)');
              },
              duration: 1000
          },'ease');
*/
      }
      else if (sign > 0) {
        this.zoomOut(clickPoint);
/*        $(".zoom-element").animate({ whyNotToUseANonExistingProperty: 100 }, {
              step: function(now,fx) {
                  $(".pan-zoom-frame").css('-webkit-transform-origin', originStr);
                  $(".pan-zoom-frame").css('-webkit-transform', 'scale(.9)');
              },
              duration: 1000
          },'ease');
*/
      }
    }
  }

  onDblClick($event: any) {
    // log.debug("onDblClick()");
    if (this.config.zoomOnDoubleClick) {
      let clickPoint = {
        x: $event.pageX - this.frameElement.offset().left,
        y: $event.pageY - this.frameElement.offset().top
      };
      this.zoomIn(clickPoint);
    }
    // this.viewChangedEmitter.emit();
  }

  onMousedown($event: any) {
    // log.debug("onMousedown()", $event);

    if ($event.button === 0 || $event.type === 'touchstart') {
      // log.debug("left mouse button down");
      if (this.config.panOnClickDrag) {
        this.previousPosition = {
          x: $event.pageX,
          y: $event.pageY
        };
        this.lastMouseEventTime = $.now();
        this.dragging = true;
        this.model.isPanning = false;

        this.onMouseMoveRemoveFunc = this.renderer.listen('document', 'mousemove', (e: any) => this.onMouseMove(e) );
        this.onMouseUpRemoveFunc = this.renderer.listen('document', 'mouseup', () => this.onMouseUp() );
        this.onTouchEndRemoveFunc = this.renderer.listen(this.element, 'touchend', (e: any) => this.onTouchEnd(e));
        this.onTouchMoveRemoveFunc = this.renderer.listen(this.element, 'touchmove', (e: any) => this.onTouchMove(e));
      }

      return false;
    }
  }

  onMouseUp() {
    // log.debug("onMouseup()");
    let now = $.now();
    let timeSinceLastMouseEvent = (now - this.lastMouseEventTime) / 1000;

    if (this.panVelocity) {
      // apply strong initial dampening if the mouse up occured much later than
      // the last mouse move, indicating that the mouse hasn't moved recently
      // TBD experiment with this formula
      let initialMultiplier = Math.max(0, Math.pow(timeSinceLastMouseEvent + 1, -4) - 0.2);

      this.panVelocity.x *= initialMultiplier;
      this.panVelocity.y *= initialMultiplier;
    }

    this.dragging = false;
    this.model.isPanning = false;

    this.onMouseMoveRemoveFunc();
    this.onMouseUpRemoveFunc();
    this.onTouchEndRemoveFunc();
    this.onTouchMoveRemoveFunc();

    // Set the overlay to noneblocking again:
    this.renderer.setElementStyle(this.panzoomOverlay, 'display', 'none');
  }


  onTouchStart($event: any) {
    // log.debug("onTouchStart()", $event);
    $event.preventDefault();

    if ($event.touches.length === 1) {
      // single touch, get ready for panning
      this.onMousedown($event);
    }
    else {
      // multiple touches, get ready for zooming

      // Calculate x and y distance between touch events
      let x = $event.touches[0].pageX - $event.touches[1].pageX;
      let y = $event.touches[0].pageY - $event.touches[1].pageY;

      // Calculate length between touch points with pythagoras
      // There is no reason to use Math.pow and Math.sqrt as we
      // only want a relative length and not the exact one.
      this.previousPosition = {
        length: x * x + y * y
      };
    }
  }

  onTouchMove($event: any) {
    // log.debug("onTouchMove()");
    $event.preventDefault();

    if ($event.touches.length === 1) {
        // single touch, emulate mouse move
        this.onMouseMove($event);
    }
    else {
      // multiple touches, zoom in/out

      // Calculate x and y distance between touch events
      let x = $event.touches[0].pageX - $event.touches[1].pageX;
      let y = $event.touches[0].pageY - $event.touches[1].pageY;
      // Calculate length between touch points with pythagoras
      // There is no reason to use Math.pow and Math.sqrt as we
      // only want a relative length and not the exact one.
      let length = x * x + y * y;

      // Calculate delta between current position and last position
      let delta = length - this.previousPosition.length;

      // Naive hysteresis
      if (Math.abs(delta) < 100) {
          return;
      }

      // Calculate center between touch points
      let centerX = $event.touches[1].pageX + x / 2;
      let centerY = $event.touches[1].pageY + y / 2;

      // Calculate zoom center
      let clickPoint = {
          x: centerX - this.frameElement.offset().left,
          y: centerY - this.frameElement.offset().top
      };

      this.changeZoomLevel(this.base.zoomLevel + delta * 0.0001, clickPoint);

      // Update length for next move event
      this.previousPosition = {
          length: length
      };
    }
  }

  onTouchEnd($event: any) {
    // log.debug("onTouchEnd()");
    this.onMouseUp();
  }



  pan(delta: any): void {
    // log.debug("pan()");
    delta.x = delta.x || 0;
    delta.y = delta.y || 0;
    this.base.pan.x += delta.x;
    this.base.pan.y += delta.y;

    this.syncModelToDOM();
  }

  onMouseMove($event: any) {
    $event.preventDefault();
    $event.stopPropagation();

    let now = $.now();
    let timeSinceLastMouseEvent = (now - this.lastMouseEventTime) / 1000;
    this.hasPanned = true;
    this.lastMouseEventTime = now;
    let dragDelta = {
      x: $event.pageX - this.previousPosition.x,
      y: $event.pageY - this.previousPosition.y
    };

    if (this.config.keepInBounds) {
      let topLeftCornerView = this.getViewPosition({ x: 0, y: 0 });
      let bottomRightCornerView = this.getViewPosition({ x: this.viewportWidth, y: this.viewportHeight });

      if (topLeftCornerView.x > 0 && dragDelta.x > 0) {
        dragDelta.x *= Math.min(Math.pow(topLeftCornerView.x, -this.config.keepInBoundsDragPullback), 1);
      }

      if (topLeftCornerView.y > 0 && dragDelta.y > 0) {
        dragDelta.y *= Math.min(Math.pow(topLeftCornerView.y, -this.config.keepInBoundsDragPullback), 1);
      }

      if (bottomRightCornerView.x < this.viewportWidth && dragDelta.x < 0) {
        dragDelta.x *= Math.min(Math.pow(this.viewportWidth - bottomRightCornerView.x, -this.config.keepInBoundsDragPullback), 1);
      }

      if (bottomRightCornerView.y < this.viewportHeight && dragDelta.y < 0) {
        dragDelta.y *= Math.min(Math.pow(this.viewportHeight - bottomRightCornerView.y, -this.config.keepInBoundsDragPullback), 1);
      }
    }

    this.pan(dragDelta);


    if (!this.model.isPanning) {
      // This will improve the performance,
      // because the browser stops evaluating hits against the elements displayed inside the pan zoom view.
      // Besides this, mouse events will not be sent to any other elements,
      // this prevents issues like selecting elements while dragging.
      this.renderer.setElementStyle(this.panzoomOverlay, 'display', 'block');
    }


    this.model.isPanning = true;


    // set these for the animation slow down once drag stops
    this.panVelocity = {
      x: dragDelta.x / timeSinceLastMouseEvent,
      y: dragDelta.y / timeSinceLastMouseEvent
    };

    this.previousPosition = {
      x: $event.pageX,
      y: $event.pageY
    };

  }

  onMouseleave() {
    // log.debug("onMouseleave()");
    this.onMouseUp(); // same behaviour
  }




  AnimationTick(): Function {
    // log.debug("AnimationTick()");
    let lastTick: any = null;

    return function(timestamp: any) {
      // log.debug("AnimationTick: returnedFunc");
      let now = $.now();

      let deltaTime = lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;

      if (this.zoomAnimation) {
        // log.debug('zoomAnimation: model is zooming');
        this.zoomAnimation.progress += deltaTime / this.zoomAnimation.duration;

        if (this.zoomAnimation.progress >= 1.0) {
          this.zoomAnimation.progress = 1.0;
          this.syncModelToDOM();
          this.base.zoomLevel = this.model.zoomLevel;
          this.base.pan.x = this.model.pan.x;
          this.base.pan.y = this.model.pan.y;
          this.zoomAnimation = undefined;
          if (this.config.modelChangedCallback) {
            this.config.modelChangedCallback(this.model);
          }
        }
      }

      if (this.panVelocity && !this.dragging) {
        // prevent overshooting if delta time is large for some reason. We apply the simple solution of
        // slicing delta time into smaller pieces and applying each one
        while (deltaTime > 0) {
          let dTime = Math.min(0.02, deltaTime);
          deltaTime -= dTime;
          this.base.pan.x += this.panVelocity.x * dTime;
          this.panVelocity.x *= (1 - this.config.friction * dTime);
          this.base.pan.y += this.panVelocity.y * dTime;
          this.panVelocity.y *= (1 - this.config.friction * dTime);
          let speed = this.panVelocity.length;
          if (speed < this.config.haltSpeed) {
            this.panVelocity = undefined;

            if (this.config.modelChangedCallback) {
              this.config.modelChangedCallback(this.model);
            }

            break;
          }
        }
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
        this.config.modelChangedCallback(this.model);
      }

      if (this.animationFrame && !this.scopeIsDestroyed) {
        this.animationFrame(this.tick); // If we're using requestAnimationFrame, then reschedule
      }

      return !this.scopeIsDestroyed; // kill the tick for good if the directive goes off the page
    };

  }





  getModelPosition(viewPosition: any) {
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

  zoomToFit(rectangle: any) {
    // log.debug("zoomToFit()", rectangle);
    // example rectangle: { "x": 0, "y": 100, "width": 100, "height": 100 }
    this.base = this.calcZoomToFit(rectangle);
    this.syncModelToDOM();
  }

  length(vector2d: any) {
    // log.debug("length()");
    return Math.sqrt(vector2d.x * vector2d.x + vector2d.y * vector2d.y);
  }

  syncModelToDOM() {
    // log.debug("syncModelToDOM()");
    if (this.zoomAnimation) {
        // log.debug('zoomAnimation');
        this.model.zoomLevel = this.base.zoomLevel + this.zoomAnimation.deltaZoomLevel * this.zoomAnimation.progress;
        let deltaT = this.zoomAnimation.translationFromZoom(this.model.zoomLevel);
        this.model.pan.x = this.base.pan.x + deltaT.x;
        this.model.pan.y = this.base.pan.y + deltaT.y;

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
    else {
      this.model.zoomLevel = this.base.zoomLevel;
      this.model.pan.x = this.base.pan.x;
      this.model.pan.y = this.base.pan.y;
    }

    let scale = this.getCssScale(this.model.zoomLevel);
    let scaleString = 'scale3d(' + scale + ', ' + scale + ', ' + scale + ')';

    // here's where the rubber hits the road - this applies the animation.  it consists of using the
    if (navigator.userAgent.indexOf('Chrome') !== -1) {
      // this is all scaling
      // log.debug("syncModelToDOM: Chrome");
      // For Chrome, use the zoom style by default, as it doesn't handle nested SVG very well
      // when using transform
      if ( this.config.chromeUseTransform ) {
        // log.debug("syncModelToDOM: zoom using chrome transform");
        // this.renderer.setElementStyle(this.zoomElement, 'transformOrigin', '0 0');
        // this.renderer.setElementStyle(this.zoomElement, 'transform', scaleString);
        // example: scale(0.8218728816747501)
        // example1: -webkit-transform: scale(0.8218728816747501)
        // this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
        // this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString );

        // try this for 3d
        this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
        this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString );
      }
      else {
        // log.debug("syncModelToDOM: zoom without using chrome transform");
        // http://caniuse.com/#search=zoom
        // this.zoomElementDOM.style.zoom = scale;
        this.renderer.setElementStyle(this.zoomElement, 'zoom', scale.toString());
        // this.renderer.setElementStyle(this.zoomElement, 'transform-origin', '0 0');
        // this.renderer.setElementStyle(this.zoomElement, 'transform', scaleString);
        // this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
        // this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString );
      }
    }
    else {
      // log.debug("syncModelToDOM: zoom (not chrome)");
      // Special handling of IE, as it doesn't support the zoom style
      // http://caniuse.com/#search=transform

      // Firefox
      this.renderer.setElementStyle(this.zoomElement, '-moz-transform-origin', '0 0');
      this.renderer.setElementStyle(this.zoomElement, '-moz-transform', scaleString);

      // Safari etc..
      this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
      this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString);

      // IE 9.0
      this.renderer.setElementStyle(this.zoomElement, '-ms-transform-origin', '0 0');
      this.renderer.setElementStyle(this.zoomElement, '-ms-transform', scaleString);

      // IE > 9.0
      this.renderer.setElementStyle(this.zoomElement, 'transform-origin', '0 0');
      this.renderer.setElementStyle(this.zoomElement, 'transform', scaleString);
    }

    if (this.config.useHardwareAcceleration) {
      // this is all panning
      // log.debug("syncModelToDOM: pan using hardware acceleration");
      let translate3d = 'translate3d(' + this.model.pan.x + 'px, ' + this.model.pan.y + 'px, 0)';
      this.renderer.setElementStyle(this.panElement, '-webkit-transform', translate3d);
      this.renderer.setElementStyle(this.panElement, '-moz-transform', translate3d);
      this.renderer.setElementStyle(this.panElement, '-ms-transform', translate3d);
      this.renderer.setElementStyle(this.panElement, 'transform', translate3d);
    }
    else {
      // log.debug("syncModelToDOM: pan without hardware acceleration");
      // this.panElementDOM.style.left = this.model.pan.x + 'px';
      // this.panElementDOM.style.top = this.model.pan.y + 'px';
      this.renderer.setElementStyle(this.panElement, 'left', this.model.pan.x + 'px');
      this.renderer.setElementStyle(this.panElement, 'top', this.model.pan.y + 'px');
    }
  }


  getCenterPoint() {
    // log.debug("getCenterPoint()");
    let center = {
      x: this.frameElement.width() / 2,
      y: this.frameElement.height() / 2
    };
    return center;
  }



  getViewPosition(modelPosition: any) {
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

  getCssScale(zoomLevel: any): number {
    // log.debug("getCssScale()");
    return Math.pow(this.config.scalePerZoomLevel, zoomLevel - this.config.neutralZoomLevel);
  }

  getZoomLevel(cssScale: any) {
    // log.debug("getZoomLevel()");
    return Math.log(cssScale) / Math.log(this.config.scalePerZoomLevel) + this.config.neutralZoomLevel;
  }

  calcZoomToFit(rect: any) {
    // log.debug("calcZoomToFit()");
    // let (W, H) denote the size of the viewport
    // let (w, h) denote the size of the rectangle to zoom to
    // then we must CSS scale by the min of W/w and H/h in order to just fit the rectangle

    let W = this.frameElementRef.nativeElement.offsetWidth;
    let H = this.frameElementRef.nativeElement.offsetHeight;

    let w = rect.width;
    let h = rect.height;

    let cssScaleExact = Math.min(W / w, H / h);
    let zoomLevelExact = this.getZoomLevel(cssScaleExact);
    let zoomLevel = zoomLevelExact * this.config.zoomToFitZoomLevelFactor;
    let cssScale = this.getCssScale(zoomLevel);

    return {
        zoomLevel: zoomLevel,
        pan: {
            x: -rect.x * cssScale + (W - w * cssScale) / 2,
            y: -rect.y * cssScale + (H - h * cssScale) / 2
        }
    };
}

  zoomIn(clickPoint: any) {
    // log.debug("zoomIn()");
    this.changeZoomLevel( this.base.zoomLevel + this.config.zoomButtonIncrement, clickPoint );
  }

  zoomOut(clickPoint: any) {
    // log.debug("zoomOut()");
    this.changeZoomLevel( this.base.zoomLevel - this.config.zoomButtonIncrement, clickPoint );
  }

  changeZoomLevel(newZoomLevel: any, clickPoint: any) {
    // log.debug("changeZoomLevel()");
    // cancel any existing zoom animation
    if (this.zoomAnimation) {
      this.base.zoomLevel = this.model.zoomLevel;
      this.base.pan.x = this.model.pan.x;
      this.base.pan.y = this.model.pan.y;
      this.zoomAnimation = undefined;
    }

    // keep zoom level in bounds
    let minimumAllowedZoomLevel = this.config.keepInBounds ? this.config.neutralZoomLevel : 0;
    newZoomLevel = Math.max(minimumAllowedZoomLevel, newZoomLevel);
    newZoomLevel = Math.min(this.config.zoomLevels - 1, newZoomLevel);

    let deltaZoomLevel = newZoomLevel - this.base.zoomLevel;
    if (!deltaZoomLevel) {
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

    let pmark = clickPoint || this.getCenterPoint();

    let s0 = this.getCssScale(this.base.zoomLevel);
    let t0 = {
      x: this.base.pan.x,
      y: this.base.pan.y
    };

    let translationFromZoom = function (zoomLevel: any) {
      // log.debug("changeZoomLevel: translationFromZoom");
      let s1 = this.getCssScale(zoomLevel);
      let t1 = {
        x: pmark.x - (s1 / s0) * (pmark.x - t0.x),
        y: pmark.y - (s1 / s0) * (pmark.y - t0.y)
      };

      return {
        x: t1.x - t0.x,
        y: t1.y - t0.y
      };
    };

    // now rewind to the start of the anim and let it run its course
    this.zoomAnimation = {
      deltaZoomLevel: deltaZoomLevel,
      translationFromZoom: translationFromZoom.bind(this),
      duration: this.config.zoomStepDuration,
      // If zoom animation disabled set progress to finish and run normal animation loop
      progress: this.config.disableZoomAnimation ? 1.0 : 0.0
    };
  }


}

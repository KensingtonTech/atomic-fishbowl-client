import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, AfterContentInit, OnDestroy, ElementRef, ViewChild, Input, Renderer, NgZone, AfterViewChecked } from '@angular/core';
import { PanZoomApiService } from './panzoom-api.service';
import { PanZoomConfigService } from './panzoom-config.service';
import { PanZoomModelService } from './panzoom-model.service';
import { WindowRefService } from './panzoom-windowref.service';
// import * as $ from 'jquery';
// declare var $: any;
declare var log: any;

@Component( {
  selector: 'panzoom',
  //changeDetection: ChangeDetectionStrategy.OnPush,
/*
<div #panzoomElement class="pan-zoom-frame" (dblclick)="onDblClick($event)" (mousedown)="onMousedown($event)" (msdWheel)="onMouseWheel($event)"  style="position:relative; cursor:move; overflow: hidden;">
  <div #panElement class="pan-element" style="position: absolute; left: 0px; top: 0px;">
    <div #zoomElement class="zoom-element">
      <ng-content></ng-content>
    </div>
  </div>
</div>
<to-body-displacer>
  <div #panzoomOverlay style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0; display: none;"></div>
</to-body-displacer>
*/
//overflow:hidden
//position:absolute;left:0px;top:0px
//width:800px;height:600px;
//style="position:relative;overflow:hidden;cursor:move"

//class="zoom-element"
//class="pan-element"
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

export class PanZoomComponent implements OnInit, AfterContentInit, AfterViewChecked, OnDestroy {

  element : any;
  jElement : any;
  window : any;
  model: any;

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

  @Input('id') elementId: string;
  @Input('addStyle') addStyle: string; //gets appended to style attribute of div.#panzoomElement

  $document : any;
  api : any;
  viewportHeight : any;
  viewportWidth : any;
  lastMouseEventTime : any;
  base: any;
  previousPosition : any = undefined;
  scopeIsDestroyed: boolean = false;
  dragging: boolean = false;
  panVelocity: any = undefined;
  zoomAnimation: any = undefined;

  ngAfterViewChecked() {
    //console.log('View checked!!!!!')
  }


  ngOnInit(): void {
    console.log("ngOnInit(): initializing PanZoomComponent");
    //disable change detection
    //this._changeDetectionRef.detach();
    //var frameStyle=this.frameElementRef.nativeElement.attributes.style.nodeValue;
    var frameStyle=this.frameElementRef.nativeElement.attributes.style.value;
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

    //console.log(this.base);
    this.model.zoomLevel = this.base.zoomLevel;

    //Only true if panning has actually taken place, not just after mousedown
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
    if (this.elementId) {
      this.panZoomApiService.registerAPI(this.elementId, this.api)
    }

  }

  tick: any;
  frameElement: any;
  panElement: any;
  zoomElement: any;
  panElementDOM: any;
  zoomElementDOM: any;
  animationFrame: any;
  panzoomOverlay: any;

  ngAfterContentInit(): void {
    //console.log("ngAfterContentInit()");


    //this.$document = this.window.document;
    //this.$document = $(document);
    this.$document = $(this.window.document);
    this.jElement = this.$document.find('.pan-zoom-frame');

    //this.viewportHeight = this.element.find('.zoom-element').children().height();
    //this.viewportWidth = this.element.find('.zoom-element').children().width();
    this.viewportHeight = this.jElement.find('.zoom-element').children().height(); //45
    this.viewportWidth = this.jElement.find('.zoom-element').children().width(); //146.219


    this.renderer.listen(this.element, 'touchstart', ($event: any) => this.onTouchStart($event) );


    //var panElement = this.element.find('.pan-element');  //migrated to @ViewChild panElement
    this.panElement = this.panElementRef.nativeElement;


    //var zoomElement = this.element.find('.zoom-element');  //migrated to @ViewChild zoomElement
    this.zoomElement = this.zoomElementRef.nativeElement;

    this.panzoomOverlay = this.panzoomOverlayRef.nativeElement;

    //this.frameElement = this.element;
    this.frameElement = this.jElement;
    //this.panElementDOM = panElement.get(0);
    //this.zoomElementDOM = zoomElement.get(0);

    //this.panElementDOM = this.panElementRef.nativeElement.get(0);
    //this.zoomElementDOM = this.zoomElementRef.nativeElement.get(0);

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

    //I *THINK* this goes in ngAfterViewInit.  Will check back
    this.syncModelToDOM();


    this.zone.runOutsideAngular( () => {
      this.tick = new (<any>this.AnimationTick()).bind(this);
      //this.tick = new (<any>this.AnimationTick()).bind(this);
      if (this.animationFrame) {
        //console.log("Got animation frame");
        this.animationFrame(this.tick);
      }
      else {
        console.log("Didn't get animation frame.  Reverting to jquery");
        (<any>$.fx).timer(this.tick);
      }
    });
    //this.$document.find('.cdk-overlay-pane ').css('pointer-events', 'none'); //allow pointer events to propagate through the overlay divs
    this.renderer.setElementStyle(this.panzoomOverlay, 'pointer-events', 'none');
  }

  ngOnDestroy(): void {
    console.log("ngOnDestroy()");
    this.panZoomApiService.unregisterAPI(this.elementId);
    this.scopeIsDestroyed = true;
  }


////////////////////////////END OF LIFECYCLE HOOKS////////////////////////////


  onMouseWheel(e: any): void {
    //console.log("OnMouseWheel()");
    //unpack '$event' passed in as 'e' as Angular 2 doesn't support multiple output params
    var $event = e.event;
    var $delta = e.delta;
    var $deltaX = e.deltaX;
    var $deltaY = e.deltaY;

    if (this.config.zoomOnMouseWheel) {
      $event.preventDefault(); //?

      if (this.zoomAnimation) {
        return; // already zooming
      }

      var sign = $deltaY / Math.abs($deltaY);

      if (this.config.invertMouseWheel) {
        sign = -sign;
      }

      var clickPoint = {
        x: $event.originalEvent.pageX - this.frameElement.offset().left,
        y: $event.originalEvent.pageY - this.frameElement.offset().top
      };

      //console.log("clickPoint:", clickPoint);


      //var originStr = $event.originalEvent.pageX + 'px ' + $event.originalEvent.pageY + 'px';
      //console.log(originStr);
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

    //this.viewChangedEmitter.emit();
}

  onDblClick($event: any) {
    //console.log("onDblClick()");
    if (this.config.zoomOnDoubleClick) {
      var clickPoint = {
        x: $event.pageX - this.frameElement.offset().left,
        y: $event.pageY - this.frameElement.offset().top
      };
      this.zoomIn(clickPoint);
    }
    //this.viewChangedEmitter.emit();
  }

  onMouseMoveRemoveFunc : Function;
  onMouseUpRemoveFunc : Function;
  onTouchEndRemoveFunc : Function;
  onTouchMoveRemoveFunc : Function;

  onMousedown($event: any) {
    //console.log("onMousedown()", $event);

    if ($event.button === 0 || $event.type === 'touchstart') {
      //console.log("left mouse button down");
      if (this.config.panOnClickDrag) {
        this.previousPosition = {
          x: $event.pageX,
          y: $event.pageY
        };
        this.lastMouseEventTime = $.now();
        this.dragging = true;
        this.model.isPanning = false;

        this.onMouseMoveRemoveFunc = this.renderer.listen('document', 'mousemove', ($event: any) => this.onMouseMove($event) );
        this.onMouseUpRemoveFunc = this.renderer.listen('document', 'mouseup', () => this.onMouseUp() );
        this.onTouchEndRemoveFunc = this.renderer.listen(this.element, 'touchend', ($event: any) => this.onTouchEnd($event));
        this.onTouchMoveRemoveFunc = this.renderer.listen(this.element, 'touchmove', ($event: any) => this.onTouchMove($event));
      }

      return false;
    }
  }

  onMouseUp() {
    //console.log("onMouseup()");
    var now = $.now();
    var timeSinceLastMouseEvent = (now - this.lastMouseEventTime) / 1000;

    if (this.panVelocity) {
      // apply strong initial dampening if the mouse up occured much later than
      // the last mouse move, indicating that the mouse hasn't moved recently
      // TBD experiment with this formula
      var initialMultiplier = Math.max(0, Math.pow(timeSinceLastMouseEvent + 1, -4) - 0.2);

      this.panVelocity.x *= initialMultiplier;
      this.panVelocity.y *= initialMultiplier;
    }

    this.dragging = false;
    this.model.isPanning = false;

    this.onMouseMoveRemoveFunc();
    this.onMouseUpRemoveFunc();
    this.onTouchEndRemoveFunc();
    this.onTouchMoveRemoveFunc();


    //Set the overlay to noneblocking again:
    //this.$overlay.css('display', 'none');
    this.renderer.setElementStyle(this.panzoomOverlay, 'display', 'none');
    //this.$document.find('.cdk-overlay-container').css('display', 'none');
    //this.$document.find('.cdk-overlay-pane ').css('display', 'none');

  }


  onTouchStart($event: any) {
    //console.log("onTouchStart()", $event);
    $event.preventDefault();

    if ($event.touches.length === 1) {
      //console.log("got to 1");
      // single touch, get ready for panning
      this.onMousedown($event);
    }
    else {
      //console.log("got to 2");
      // multiple touches, get ready for zooming

      // Calculate x and y distance between touch events
      var x = $event.touches[0].pageX - $event.touches[1].pageX;
      var y = $event.touches[0].pageY - $event.touches[1].pageY;

      // Calculate length between touch points with pythagoras
      // There is no reason to use Math.pow and Math.sqrt as we
      // only want a relative length and not the exact one.
      this.previousPosition = {
        length: x * x + y * y
      };
    }
  }

  onTouchMove($event: any) {
    //console.log("onTouchMove()");
    $event.preventDefault();

    if ($event.touches.length === 1) {
        // single touch, emulate mouse move
        this.onMouseMove($event);
    }
    else {
      // multiple touches, zoom in/out

      // Calculate x and y distance between touch events
      var x = $event.touches[0].pageX - $event.touches[1].pageX;
      var y = $event.touches[0].pageY - $event.touches[1].pageY;
      // Calculate length between touch points with pythagoras
      // There is no reason to use Math.pow and Math.sqrt as we
      // only want a relative length and not the exact one.
      var length = x * x + y * y;

      // Calculate delta between current position and last position
      var delta = length - this.previousPosition.length;

      // Naive hysteresis
      if (Math.abs(delta) < 100) {
          return;
      }

      // Calculate center between touch points
      var centerX = $event.touches[1].pageX + x / 2;
      var centerY = $event.touches[1].pageY + y / 2;

      // Calculate zoom center
      var clickPoint = {
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
    //console.log("onTouchEnd()");
    this.onMouseUp();
  }



  pan(delta: any) : void {
    //console.log("pan()");
    delta.x = delta.x || 0;
    delta.y = delta.y || 0;
    this.base.pan.x += delta.x;
    this.base.pan.y += delta.y;

    this.syncModelToDOM();
  }

  hasPanned : Boolean;

  onMouseMove($event: any) {
    $event.preventDefault();
    $event.stopPropagation();

    var now = $.now();
    var timeSinceLastMouseEvent = (now - this.lastMouseEventTime) / 1000;
    this.hasPanned = true;
    this.lastMouseEventTime = now;
    var dragDelta = {
      x: $event.pageX - this.previousPosition.x,
      y: $event.pageY - this.previousPosition.y
    };

    if (this.config.keepInBounds) {
      var topLeftCornerView = this.getViewPosition({ x: 0, y: 0 });
      var bottomRightCornerView = this.getViewPosition({ x: this.viewportWidth, y: this.viewportHeight });

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
      //This will improve the performance,
      //because the browser stops evaluating hits against the elements displayed inside the pan zoom view.
      //Besides this, mouse events will not be sent to any other elements,
      //this prevents issues like selecting elements while dragging.
      //this.$overlay.css('display', 'block');
      this.renderer.setElementStyle(this.panzoomOverlay, 'display', 'block');
      //this.$document.find('.cdk-overlay-container').css('display', '');
      //this.$document.find('.cdk-overlay-pane ').css('display', '');
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

    //this.viewChangedEmitter.emit();
  }

  onMouseleave() {
    //console.log("onMouseleave()");
    this.onMouseUp(); // same behaviour
  }




  AnimationTick(): Function {
    //console.log("AnimationTick()");
    var lastTick : any = null;


//    return function() {
//       console.log("AnimationTick: returnedFunc");
//    }

    return function(timestamp: any) {
      //console.log("AnimationTick: returnedFunc");
      var now = $.now();
      //console.log("now:", now);
      //timestamp: 103306.5179999976
      //now: 1494098514803
      var deltaTime = lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;

      if (this.zoomAnimation) {
        //console.log('zoomAnimation: model is zooming');
        this.zoomAnimation.progress += deltaTime / this.zoomAnimation.duration;

        if (this.zoomAnimation.progress >= 1.0) {
          this.zoomAnimation.progress = 1.0;

          //console.log("got to 1");
          this.syncModelToDOM();

          this.base.zoomLevel = this.model.zoomLevel;
          this.base.pan.x = this.model.pan.x;
          this.base.pan.y = this.model.pan.y;

          this.zoomAnimation = undefined;

          if (this.config.modelChangedCallback) {
            this.config.modelChangedCallback(this.model);
            //this._changeDetectionRef.markForCheck();
            //this._changeDetectionRef.detectChanges();
          }
        }
      }

      if (this.panVelocity && !this.dragging) {
        //console.log("2");
        // prevent overshooting if delta time is large for some reason. We apply the simple solution of
        // slicing delta time into smaller pieces and applying each one
        while (deltaTime > 0) {
          var dTime = Math.min(0.02, deltaTime);
          deltaTime -= dTime;

          this.base.pan.x += this.panVelocity.x * dTime;
          this.panVelocity.x *= (1 - this.config.friction * dTime);

          this.base.pan.y += this.panVelocity.y * dTime;
          this.panVelocity.y *= (1 - this.config.friction * dTime);

//!!!!check back and see why I changed var to let!!!!
//because it's local to just this block.
          //var speed = length(this.panVelocity);
          let speed = this.panVelocity.length;
          if (speed < this.config.haltSpeed) {
            this.panVelocity = undefined;

            if (this.config.modelChangedCallback) {
              this.config.modelChangedCallback(this.model);
              //this._changeDetectionRef.markForCheck();
            }

            break;
          }
        }
      }

      if (this.config.keepInBounds && !this.dragging) {
        //console.log("3");
        var topLeftCornerView = this.getViewPosition({ x: 0, y: 0 });
        var bottomRightCornerView = this.getViewPosition({ x: this.viewportWidth, y: this.viewportHeight });

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

      //console.log("got to 2");
      this.syncModelToDOM();

      if (this.dragging) {
        //console.log("4: dragging: modelchangedcallback");
        this.config.modelChangedCallback(this.model);
        //this._changeDetectionRef.markForCheck();
      }

      if (this.animationFrame && !this.scopeIsDestroyed) {
        this.animationFrame(this.tick); //If we're using requestAnimationFrame reschedule
      }

      return !this.scopeIsDestroyed; // kill the tick for good if the directive goes off the page
    };

  }





  getModelPosition(viewPosition: any) {
    //console.log("getModelPosition()");
    //  p = (1/s)(p' - t)
    var pmark = viewPosition;
    var s = this.getCssScale(this.base.zoomLevel);
    var t = this.base.pan;

    return {
      x: (1 / s) * (pmark.x - t.x),
      y: (1 / s) * (pmark.y - t.y)
    };
  }

  zoomToFit(rectangle: any) {
    //console.log("zoomToFit()", rectangle);
    // example rectangle: { "x": 0, "y": 100, "width": 100, "height": 100 }
    //console.log(this.base);
    this.base = this.calcZoomToFit(rectangle);
    //console.log(this.base);
    //console.log("got to 3");
    this.syncModelToDOM();
  }

  length(vector2d: any) {
    //console.log("length()");
    return Math.sqrt(vector2d.x * vector2d.x + vector2d.y * vector2d.y);
  }

  syncModelToDOM() {

    //console.log("caller:", arguments.callee.caller.toString() );
    //console.log("caller:", Function.caller );
    //console.log("syncModelToDOM()");
    if (this.zoomAnimation) {
        //console.log('zoomAnimation');
        this.model.zoomLevel = this.base.zoomLevel + this.zoomAnimation.deltaZoomLevel * this.zoomAnimation.progress;
        var deltaT = this.zoomAnimation.translationFromZoom(this.model.zoomLevel);
        this.model.pan.x = this.base.pan.x + deltaT.x;
        this.model.pan.y = this.base.pan.y + deltaT.y;

        if (this.config.keepInBounds) {
          var topLeftCornerView = this.getViewPosition({ x: 0, y: 0 });
          var bottomRightCornerView = this.getViewPosition({ x: this.viewportWidth, y: this.viewportHeight });

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

    var scale = this.getCssScale(this.model.zoomLevel);
    //var scaleString = 'scale(' + scale + ')';
    var scaleString = 'scale3d(' + scale + ', ' + scale + ', ' + scale + ')';
    //console.log('scaleString', scaleString);

    //var scalezString = 'scaleZ(' + scale + ')';



    //here's where the rubber hits the road - this applies the animation.  it consists of using the
    if (navigator.userAgent.indexOf('Chrome') !== -1) {
      //this is all scaling
      //console.log("syncModelToDOM: Chrome");
      // For Chrome, use the zoom style by default, as it doesn't handle nested SVG very well
      // when using transform
      if( this.config.chromeUseTransform ) {
        //console.log("syncModelToDOM: zoom using chrome transform");
        //this.renderer.setElementStyle(this.zoomElement, 'transformOrigin', '0 0');
        //this.renderer.setElementStyle(this.zoomElement, 'transform', scaleString);
        //example: scale(0.8218728816747501)
        //example1: -webkit-transform: scale(0.8218728816747501)
        //this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
        //this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString );


        //try this for 3d
        this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
        this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString );
      }
      else {
        //console.log("syncModelToDOM: zoom without using chrome transform");
        // http://caniuse.com/#search=zoom
        //this.zoomElementDOM.style.zoom = scale;
        this.renderer.setElementStyle(this.zoomElement, 'zoom', scale.toString());
        //this.renderer.setElementStyle(this.zoomElement, 'transform-origin', '0 0');
        //this.renderer.setElementStyle(this.zoomElement, 'transform', scaleString);
        //this.renderer.setElementStyle(this.zoomElement, '-webkit-transform-origin', '0 0');
        //this.renderer.setElementStyle(this.zoomElement, '-webkit-transform', scaleString );
      }
    }
    else {
      //console.log("syncModelToDOM: zoom (not chrome)");
      // Special handling of IE, as it doesn't support the zoom style
      // http://caniuse.com/#search=transform

      //Firefox
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
      //this is all panning
      //console.log("syncModelToDOM: pan using hardware acceleration");
      var translate3d = 'translate3d(' + this.model.pan.x + 'px, ' + this.model.pan.y + 'px, 0)';
      this.renderer.setElementStyle(this.panElement, '-webkit-transform', translate3d);
      this.renderer.setElementStyle(this.panElement, '-moz-transform', translate3d);
      this.renderer.setElementStyle(this.panElement, '-ms-transform', translate3d);
      this.renderer.setElementStyle(this.panElement, 'transform', translate3d);
    }
    else {
      //console.log("syncModelToDOM: pan without hardware acceleration");
      //this.panElementDOM.style.left = this.model.pan.x + 'px';
      //this.panElementDOM.style.top = this.model.pan.y + 'px';
      this.renderer.setElementStyle(this.panElement, 'left', this.model.pan.x + 'px');
      this.renderer.setElementStyle(this.panElement, 'top', this.model.pan.y + 'px');
    }
  }



/*
		var
		props		= ['transform','-moz-transform','-ms-transform','-o-transform','-webkit-transform'],
		transform	= document.getElementById('transform'),
		matrix		= document.getElementById('matrix'),
		el			= document.getElementById('test'),
		UNDEFINED, key, v, num, positive, str, prop;
		transform.onkeyup = function(e){
			e = e ? e : event;
			key = e.keyCode || e.charCode;
			if ( key == 32 || key == 186 )
			{
				calculate();
			}
		};

		function camelize( str ) {
			var
			regex = /(-[a-z])/g,
			func  = function( bit ){
			  return bit.toUpperCase().replace( '-', '' );
			};
			camelize = function( str )
			{
			  return ( typeof str == 'string') ? str.toLowerCase().replace( regex, func )
			                           		   : str;
			};
			return camelize( str );
		}

		function getCSSValue( el, prop ) {
			var computed = window.getComputedStyle;
			if ( el.currentStyle )
			{
				getCSSValue = function( el, prop )
				{
				  return el.currentStyle[camelize( prop )];
				};
			}
			else if ( computed )
			{
				getCSSValue = function( el, prop )
				{
				  return computed( el, null ).getPropertyValue( prop );
				};
			}
			else
			{
				getCSSValue = function()
				{
				  return false;
				};
			}
			return getCSSValue( el, prop );
		}

		function addInlineStyle( el, property, value ) {
			try {
				el.style[property] = value;
				el.style[camelize( property )] = value;
			} catch( e ){
				return valse;
			}
			return true;
		}

	  function calculate() {
			var val = transform.value.replace( ';', '' ), v;
			if ( prop == UNDEFINED )
			{
				v = props.length;
				while ( v-- )
				{
					if ( addInlineStyle( el, props[v], val ) )
					{
						if ( !! getCSSValue( el, props[v] ) )
						{
							prop = props[v];
							break;
						}
					}
				}
			}
			if ( prop !== UNDEFINED )
			{
				calculate = function()
				{
					var val = transform.value.replace( ';', '' ), v;

					// set it
					addInlineStyle( el, prop, val );

					// get it back
					val = getCSSValue( el, prop );
					if ( val.match('e') )
					{
						val = val.replace(/matrix\((.*)\)/,'$1').split(',');
						v = val.length;
						while ( v-- )
						{
							val[v] = val[v].replace(/\s/,'');
							if ( val[v].match('e') )
							{
								val[v] = 0;
							}
						}
						val = 'matrix(' + val.join(', ') + ')';
					}

					// set it
					matrix.value = val;
				};
				calculate();
			}
		}
*/




  getCenterPoint() {
    //console.log("getCenterPoint()");
    var center = {
      x: this.frameElement.width() / 2,
      y: this.frameElement.height() / 2
    };
    return center;
  }



  getViewPosition(modelPosition: any) {
    //console.log("getViewPosition()");
    //  p' = p * s + t
    var p = modelPosition;
    var s = this.getCssScale(this.base.zoomLevel);
    var t = this.base.pan;

    if (this.zoomAnimation) {
      s = this.getCssScale(this.base.zoomLevel + this.zoomAnimation.deltaZoomLevel * this.zoomAnimation.progress);
      var deltaT = this.zoomAnimation.translationFromZoom(this.model.zoomLevel);
      t = { x: this.base.pan.x + deltaT.x, y: this.base.pan.y + deltaT.y };
    }

    return {
      x: p.x * s + t.x,
      y: p.y * s + t.y
    };
  }

  getCssScale(zoomLevel: any) : number {
    //console.log("getCssScale()");
    return Math.pow(this.config.scalePerZoomLevel, zoomLevel - this.config.neutralZoomLevel);
  }

  getZoomLevel(cssScale: any) {
    //console.log("getZoomLevel()");
    return Math.log(cssScale) / Math.log(this.config.scalePerZoomLevel) + this.config.neutralZoomLevel;
  }

  calcZoomToFit(rect: any) {
    //console.log("calcZoomToFit()");
    // let (W, H) denote the size of the viewport
    // let (w, h) denote the size of the rectangle to zoom to
    // then we must CSS scale by the min of W/w and H/h in order to just fit the rectangle

    var W = this.frameElementRef.nativeElement.offsetWidth;
    var H = this.frameElementRef.nativeElement.offsetHeight;

    var w = rect.width;
    var h = rect.height;

    var cssScaleExact = Math.min(W / w, H / h);
    var zoomLevelExact = this.getZoomLevel(cssScaleExact);
    var zoomLevel = zoomLevelExact * this.config.zoomToFitZoomLevelFactor;
    var cssScale = this.getCssScale(zoomLevel);

    return {
        zoomLevel: zoomLevel,
        pan: {
            x: -rect.x * cssScale + (W - w * cssScale) / 2,
            y: -rect.y * cssScale + (H - h * cssScale) / 2
        }
    };
}

  zoomIn(clickPoint: any) {
    //console.log("zoomIn()");
    this.changeZoomLevel( this.base.zoomLevel + this.config.zoomButtonIncrement, clickPoint );
  }

  zoomOut(clickPoint: any) {
    //console.log("zoomOut()");
    this.changeZoomLevel( this.base.zoomLevel - this.config.zoomButtonIncrement, clickPoint );
  }

  changeZoomLevel(newZoomLevel: any, clickPoint: any) {
    //console.log("changeZoomLevel()");
    // cancel any existing zoom animation
    if (this.zoomAnimation) {
      this.base.zoomLevel = this.model.zoomLevel;
      this.base.pan.x = this.model.pan.x;
      this.base.pan.y = this.model.pan.y;
      this.zoomAnimation = undefined;
    }

    // keep zoom level in bounds
    var minimumAllowedZoomLevel = this.config.keepInBounds ? this.config.neutralZoomLevel : 0;
    newZoomLevel = Math.max(minimumAllowedZoomLevel, newZoomLevel);
    newZoomLevel = Math.min(this.config.zoomLevels - 1, newZoomLevel);

    var deltaZoomLevel = newZoomLevel - this.base.zoomLevel;
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

    var pmark = clickPoint || this.getCenterPoint();

    var s0 = this.getCssScale(this.base.zoomLevel);
    var t0 = {
      x: this.base.pan.x,
      y: this.base.pan.y
    };

    var translationFromZoom = function (zoomLevel: any) {
      //console.log("changeZoomLevel: translationFromZoom");
      var s1 = this.getCssScale(zoomLevel);
      var t1 = {
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
      //If zoom animation disabled set progress to finish and run normal animation loop
      progress: this.config.disableZoomAnimation ? 1.0 : 0.0
    };
  }


}




























/* globals console */

//angular.module('panzoom', ['monospaced.mousewheel'])
//    .directive('panzoom', ['$document', 'PanZoomService', function ($document, panZoomService: PanZoomService) {

//            var api = {};
//            var viewportHeight;
//            var viewportWidth;

//            return {
//                restrict: 'E',
//                transclude: true,
//                scope: {
//                    config: '=',
//                    model: '='
//                },
//                controller: ['$scope', '$element',
//                    function ($scope, $element) {
/*MIGRATED
                        var frameElement = $element;
                        var panElement = $element.find('.pan-element');
                        var zoomElement = $element.find('.zoom-element');
                        var panElementDOM = panElement.get(0);
                        var zoomElementDOM = zoomElement.get(0);
                        var animationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame;

                        var $overlay;
                        var existing = $document.find('#PanZoomOverlay');

                        if (existing.length === 0) {
                            $overlay = $('<div id="PanZoomOverlay" style="position: absolute;'+
            				' top: 0; left: 0; right: 0; bottom: 0; opacity: 0; display: none;"></div>');
                            $document.find('body').append($overlay);
                        } else {
                        	$overlay = existing;
                        }


                        var getCssScale = function (zoomLevel) {
                            return Math.pow($scope.config.scalePerZoomLevel, zoomLevel - $scope.config.neutralZoomLevel);
                        };

                        var getZoomLevel = function (cssScale) {
                            return Math.log(cssScale) / Math.log($scope.config.scalePerZoomLevel) + $scope.config.neutralZoomLevel;
                        };


                        // initialize models. Use passed properties when available, otherwise revert to defaults
                        // NOTE: all times specified in seconds, all distances specified in pixels
                        $scope.config.disableZoomAnimation = $scope.config.disableZoomAnimation !== undefined ? $scope.config.disableZoomAnimation : false;
                        $scope.config.zoomLevels = $scope.config.zoomLevels !== undefined ? $scope.config.zoomLevels : 5;
                        $scope.config.neutralZoomLevel = $scope.config.neutralZoomLevel !== undefined ? $scope.config.neutralZoomLevel : 2;
                        $scope.config.friction = $scope.config.friction !== undefined ? $scope.config.friction : 10.0;
                        $scope.config.haltSpeed = $scope.config.haltSpeed !== undefined ? $scope.config.haltSpeed : 100.0;
                        $scope.config.scalePerZoomLevel = $scope.config.scalePerZoomLevel !== undefined ? $scope.config.scalePerZoomLevel : 2;
                        $scope.config.zoomStepDuration = $scope.config.zoomStepDuration !== undefined ? $scope.config.zoomStepDuration : 0.2;
                        $scope.config.zoomToFitZoomLevelFactor =
                            $scope.config.zoomToFitZoomLevelFactor !== undefined ? $scope.config.zoomToFitZoomLevelFactor : 0.95;
                        $scope.config.zoomButtonIncrement = $scope.config.zoomButtonIncrement !== undefined ? $scope.config.zoomButtonIncrement : 1.0;
                        $scope.config.useHardwareAcceleration =
                            $scope.config.useHardwareAcceleration !== undefined ? $scope.config.useHardwareAcceleration : false;

                        $scope.config.initialZoomLevel =
                            $scope.config.initialZoomLevel !== undefined ? $scope.config.initialZoomLevel : $scope.config.neutralZoomLevel;
                        $scope.config.initialPanX = $scope.config.initialPanX !== undefined ? $scope.config.initialPanX  : 0;
                        $scope.config.initialPanY = $scope.config.initialPanY || 0;
                        $scope.config.keepInBounds = $scope.config.keepInBounds ? $scope.config.keepInBounds : false;
                        if ($scope.config.keepInBounds && $scope.config.neutralZoomLevel !== 0) {
                            console.warn('You have set keepInBounds to true and neutralZoomLevel to ' + $scope.config.neutralZoomLevel +
                                         '. Be aware that the zoom level cannot below ' + $scope.config.neutralZoomLevel);
                        }
                        $scope.config.keepInBoundsRestoreForce =
                            $scope.config.keepInBoundsRestoreForce !== undefined ? $scope.config.keepInBoundsRestoreForce : 0.5;
                        $scope.config.keepInBoundsDragPullback =
                            $scope.config.keepInBoundsDragPullback !== undefined ? $scope.config.keepInBoundsDragPullback : 0.7;

                        $scope.config.zoomOnDoubleClick = $scope.config.zoomOnDoubleClick !== undefined ? $scope.config.zoomOnDoubleClick : true;
                        $scope.config.zoomOnMouseWheel = $scope.config.zoomOnMouseWheel !== undefined ? $scope.config.zoomOnMouseWheel : true;
                        $scope.config.panOnClickDrag = $scope.config.panOnClickDrag !== undefined ? $scope.config.panOnClickDrag : true;

                        $scope.config.invertMouseWheel = $scope.config.invertMouseWheel !== undefined ? $scope.config.invertMouseWheel : false;

                        $scope.config.chromeUseTransform = $scope.config.chromeUseTransform ? $scope.config.chromeUseTransform : false;



                        var calcZoomToFit = function (rect) {
                            // let (W, H) denote the size of the viewport
                            // let (w, h) denote the size of the rectangle to zoom to
                            // then we must CSS scale by the min of W/w and H/h in order to just fit the rectangle

                            var W = $element.width();
                            var H = $element.height();
                            var w = rect.width;
                            var h = rect.height;

                            var cssScaleExact = Math.min(W / w, H / h);
                            var zoomLevelExact = getZoomLevel(cssScaleExact);
                            var zoomLevel = zoomLevelExact * $scope.config.zoomToFitZoomLevelFactor;
                            var cssScale = getCssScale(zoomLevel);

                            return {
                                zoomLevel: zoomLevel,
                                pan: {
                                    x: -rect.x * cssScale + (W - w * cssScale) / 2,
                                    y: -rect.y * cssScale + (H - h * cssScale) / 2
                                }
                            };
                        };


                        if ($scope.config.initialZoomToFit) {
                            $scope.base = calcZoomToFit($scope.config.initialZoomToFit);
                        } else {
                            $scope.base = {
                                zoomLevel: $scope.config.initialZoomLevel,
                                pan: {
                                    x: $scope.config.initialPanX,
                                    y: $scope.config.initialPanY
                                }
                            };
                        }

                        $scope.model.zoomLevel = $scope.base.zoomLevel;
                        //Only true if panning has actually taken place, not just after mousedown
                        $scope.model.isPanning = false;
                        $scope.model.pan = {
                            x: $scope.base.pan.x,
                            y: $scope.base.pan.y
                        };


                        // FIXME why declare these on $scope? They could be private vars
                        $scope.previousPosition = undefined;
                        $scope.dragging = false;
                        $scope.panVelocity = undefined;
                        $scope.zoomAnimation = undefined;


                        // private

                        var syncModelToDOM = function () {
                            if ($scope.zoomAnimation) {
                                $scope.model.zoomLevel = $scope.base.zoomLevel + $scope.zoomAnimation.deltaZoomLevel * $scope.zoomAnimation.progress;
                                var deltaT = $scope.zoomAnimation.translationFromZoom($scope.model.zoomLevel);
                                $scope.model.pan.x = $scope.base.pan.x + deltaT.x;
                                $scope.model.pan.y = $scope.base.pan.y + deltaT.y;

                                if ($scope.config.keepInBounds) {
                                    var topLeftCornerView = getViewPosition({ x: 0, y: 0 });
                                    var bottomRightCornerView = getViewPosition({ x: viewportWidth, y: viewportHeight });

                                    if (topLeftCornerView.x > 0) {
                                        $scope.model.pan.x = 0;
                                    }

                                    if (topLeftCornerView.y > 0) {
                                        $scope.model.pan.y = 0;
                                    }

                                    if (bottomRightCornerView.x < viewportWidth) {
                                        $scope.model.pan.x -= (bottomRightCornerView.x - viewportWidth);
                                    }

                                    if (bottomRightCornerView.y < viewportHeight) {
                                        $scope.model.pan.y -= (bottomRightCornerView.y - viewportHeight);
                                    }
                                }

                            } else {
                                $scope.model.zoomLevel = $scope.base.zoomLevel;
                                $scope.model.pan.x = $scope.base.pan.x;
                                $scope.model.pan.y = $scope.base.pan.y;
                            }

                            var scale = getCssScale($scope.model.zoomLevel);

                            var scaleString = 'scale(' + scale + ')';

                            if (navigator.userAgent.indexOf('Chrome') !== -1) {
                                // For Chrome, use the zoom style by default, as it doesn't handle nested SVG very well
                                // when using transform
                                if( $scope.config.chromeUseTransform ) {
                                    // IE > 9.0
                                    zoomElementDOM.style.transformOrigin = '0 0';
                                    zoomElementDOM.style.transform = scaleString;
                                } else {
                                    // http://caniuse.com/#search=zoom
                                    zoomElementDOM.style.zoom = scale;
                                }

                            } else {
                                // Special handling of IE, as it doesn't support the zoom style
                                // http://caniuse.com/#search=transform

                                // IE 9.0
                                zoomElementDOM.style.msTransformOrigin = '0 0';
                                zoomElementDOM.style.msTransform = scaleString;

                                // IE > 9.0
                                zoomElementDOM.style.transformOrigin = '0 0';
                                zoomElementDOM.style.transform = scaleString;

                                // Safari etc..
                                zoomElementDOM.style.webkitTransformOrigin = '0 0';
                                zoomElementDOM.style.webkitTransform = scaleString;
                            }

                            if ($scope.config.useHardwareAcceleration) {
                                var translate = 'translate3d(' + $scope.model.pan.x + 'px, ' + $scope.model.pan.y + 'px, 0)';

                                panElementDOM.style.transform = translate;
                                panElementDOM.style.msTransform = translate;
                                panElementDOM.style.webkitTransform = translate;
                                panElementDOM.style.mozTransform = translate;
                            } else {
                                panElementDOM.style.left = $scope.model.pan.x + 'px';
                                panElementDOM.style.top = $scope.model.pan.y + 'px';
                            }
                        };


                        var getCenterPoint = function () {
                            var center = {
                                x: frameElement.width() / 2,
                                y: frameElement.height() / 2
                            };
                            return center;
                        };


                        var changeZoomLevel = function (newZoomLevel, clickPoint, duration) {
                            // cancel any existing zoom animation
                            if ($scope.zoomAnimation) {
                                $scope.base.zoomLevel = $scope.model.zoomLevel;
                                $scope.base.pan.x = $scope.model.pan.x;
                                $scope.base.pan.y = $scope.model.pan.y;

                                $scope.zoomAnimation = undefined;
                            }

                            // keep zoom level in bounds
                            var minimumAllowedZoomLevel = $scope.config.keepInBounds ? $scope.config.neutralZoomLevel : 0;
                            newZoomLevel = Math.max(minimumAllowedZoomLevel, newZoomLevel);
                            newZoomLevel = Math.min($scope.config.zoomLevels - 1, newZoomLevel);

                            var deltaZoomLevel = newZoomLevel - $scope.base.zoomLevel;
                            if (!deltaZoomLevel) {
                                return;
                            }

                            duration = duration || $scope.config.zoomStepDuration;

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

                            var pmark = clickPoint || getCenterPoint();

                            var s0 = getCssScale($scope.base.zoomLevel);
                            var t0 = {
                                x: $scope.base.pan.x,
                                y: $scope.base.pan.y
                            };

                            var translationFromZoom = function (zoomLevel) {
                                var s1 = getCssScale(zoomLevel);
                                var t1 = {
                                    x: pmark.x - (s1 / s0) * (pmark.x - t0.x),
                                    y: pmark.y - (s1 / s0) * (pmark.y - t0.y)
                                };

                                return {
                                    x: t1.x - t0.x,
                                    y: t1.y - t0.y
                                };
                            };

                            // now rewind to the start of the anim and let it run its course
                            $scope.zoomAnimation = {
                                deltaZoomLevel: deltaZoomLevel,
                                translationFromZoom: translationFromZoom,
                                duration: duration,
                                //If zoom animation disabled set progress to finish and run normal animation loop
                                progress: $scope.config.disableZoomAnimation ? 1.0 : 0.0
                            };
                        };



                        var zoomIn = function (clickPoint) {
                            changeZoomLevel(
                                $scope.base.zoomLevel + $scope.config.zoomButtonIncrement,
                                clickPoint);
                        };

                        var zoomOut = function (clickPoint) {
                            changeZoomLevel(
                                $scope.base.zoomLevel - $scope.config.zoomButtonIncrement,
                                clickPoint);
                        };


                        var getViewPosition = function (modelPosition) {
                            //  p' = p * s + t
                            var p = modelPosition;
                            var s = getCssScale($scope.base.zoomLevel);
                            var t = $scope.base.pan;

                            if ($scope.zoomAnimation) {
                                s = getCssScale($scope.base.zoomLevel + $scope.zoomAnimation.deltaZoomLevel * $scope.zoomAnimation.progress);
                                var deltaT = $scope.zoomAnimation.translationFromZoom($scope.model.zoomLevel);
                                t = { x: $scope.base.pan.x + deltaT.x, y: $scope.base.pan.y + deltaT.y };
                            }

                            return {
                                x: p.x * s + t.x,
                                y: p.y * s + t.y
                            };
                        };


                        var getModelPosition = function (viewPosition) {
                            //  p = (1/s)(p' - t)
                            var pmark = viewPosition;
                            var s = getCssScale($scope.base.zoomLevel);
                            var t = $scope.base.pan;

                            return {
                                x: (1 / s) * (pmark.x - t.x),
                                y: (1 / s) * (pmark.y - t.y)
                            };
                        };


                        var zoomToFit = function (rectangle) {
                            // example rectangle: { "x": 0, "y": 100, "width": 100, "height": 100 }
                            $scope.base = calcZoomToFit(rectangle);
                            syncModelToDOM();
                        };



                        var length = function (vector2d) {
                            return Math.sqrt(vector2d.x * vector2d.x + vector2d.y * vector2d.y);
                        };


                        var scopeIsDestroyed = false;

                        var AnimationTick = function () {
                            var lastTick = null;

                            return function () {
                                var now = jQuery.now();
                                var deltaTime = lastTick ? (now - lastTick) / 1000 : 0;
                                lastTick = now;

                                if ($scope.zoomAnimation) {
                                    $scope.zoomAnimation.progress += deltaTime / $scope.zoomAnimation.duration;

                                    if ($scope.zoomAnimation.progress >= 1.0) {
                                        $scope.zoomAnimation.progress = 1.0;

                                        syncModelToDOM();

                                        $scope.base.zoomLevel = $scope.model.zoomLevel;
                                        $scope.base.pan.x = $scope.model.pan.x;
                                        $scope.base.pan.y = $scope.model.pan.y;

                                        $scope.zoomAnimation = undefined;

                                        if ($scope.config.modelChangedCallback) {
                                            $scope.config.modelChangedCallback($scope.model);
                                        }
                                    }
                                }

                                if ($scope.panVelocity && !$scope.dragging) {
                                    // prevent overshooting if delta time is large for some reason. We apply the simple solution of
                                    // slicing delta time into smaller pieces and applying each one
                                    while (deltaTime > 0) {
                                        var dTime = Math.min(0.02, deltaTime);
                                        deltaTime -= dTime;

                                        $scope.base.pan.x += $scope.panVelocity.x * dTime;
                                        $scope.panVelocity.x *= (1 - $scope.config.friction * dTime);

                                        $scope.base.pan.y += $scope.panVelocity.y * dTime;
                                        $scope.panVelocity.y *= (1 - $scope.config.friction * dTime);

                                        var speed = length($scope.panVelocity);
                                        if (speed < $scope.config.haltSpeed) {
                                            $scope.panVelocity = undefined;

                                            if ($scope.config.modelChangedCallback) {
                                                $scope.config.modelChangedCallback($scope.model);
                                            }

                                            break;
                                        }
                                    }
                                }

                                if ($scope.config.keepInBounds && !$scope.dragging) {
                                    var topLeftCornerView = getViewPosition({ x: 0, y: 0 });
                                    var bottomRightCornerView = getViewPosition({ x: viewportWidth, y: viewportHeight });

                                    if (topLeftCornerView.x > 0) {
                                        $scope.base.pan.x -= $scope.config.keepInBoundsRestoreForce * topLeftCornerView.x;
                                    }

                                    if (topLeftCornerView.y > 0) {
                                        $scope.base.pan.y -= $scope.config.keepInBoundsRestoreForce * topLeftCornerView.y;
                                    }

                                    if (bottomRightCornerView.x < viewportWidth) {
                                        $scope.base.pan.x -= $scope.config.keepInBoundsRestoreForce * (bottomRightCornerView.x - viewportWidth);
                                    }

                                    if (bottomRightCornerView.y < viewportHeight) {
                                        $scope.base.pan.y -= $scope.config.keepInBoundsRestoreForce * (bottomRightCornerView.y - viewportHeight);
                                    }
                                }

                                syncModelToDOM();

                                if (animationFrame && !scopeIsDestroyed) {
                                    animationFrame(tick); //If we're using requestAnimationFrame reschedule
                                }

                                return !scopeIsDestroyed; // kill the tick for good if the directive goes off the page
                            };
                        };


                        syncModelToDOM();

                        var tick = new AnimationTick();
                        if (animationFrame) {
                            animationFrame(tick);
                        } else {
                            jQuery.fx.timer(tick);
                        }


                        $scope.$on('$destroy', function () {
                            this.panZoomService.unregisterAPI($scope.elementId);
                            scopeIsDestroyed = true;
                        });
                        // event handlers


                        $scope.onDblClick = function ($event) {
                            if ($scope.config.zoomOnDoubleClick) {
                                var clickPoint = {
                                    x: $event.pageX - frameElement.offset().left,
                                    y: $event.pageY - frameElement.offset().top
                                };
                                zoomIn(clickPoint);
                            }
                        };


                        var lastMouseEventTime;
                        var previousPosition;


                        $scope.onTouchStart = function($event) {
                            $event.preventDefault();

                            if ($event.originalEvent.touches.length === 1) {
                                // single touch, get ready for panning

                                // Touch events does not have pageX and pageY, make touchstart
                                // emulate a regular click event to re-use mousedown handler
                                $event.pageX = $event.originalEvent.touches[0].pageX;
                                $event.pageY = $event.originalEvent.touches[0].pageY;
                                $scope.onMousedown($event);
                            } else {
                                // multiple touches, get ready for zooming

                                // Calculate x and y distance between touch events
                                var x = $event.originalEvent.touches[0].pageX - $event.originalEvent.touches[1].pageX;
                                var y = $event.originalEvent.touches[0].pageY - $event.originalEvent.touches[1].pageY;

                                // Calculate length between touch points with pythagoras
                                // There is no reason to use Math.pow and Math.sqrt as we
                                // only want a relative length and not the exact one.
                                previousPosition = {
                                    length: x * x + y * y
                                };
                            }
                        };



                        $scope.onTouchMove = function($event) {
                        	$event.preventDefault();

                            if ($event.originalEvent.touches.length === 1) {
                                // single touch, emulate mouse move
                                $event.pageX = $event.originalEvent.touches[0].pageX;
                                $event.pageY = $event.originalEvent.touches[0].pageY;
                                $scope.onMousemove($event);
                            } else {
                                // multiple touches, zoom in/out

                                // Calculate x and y distance between touch events
                                var x = $event.originalEvent.touches[0].pageX - $event.originalEvent.touches[1].pageX;
                                var y = $event.originalEvent.touches[0].pageY - $event.originalEvent.touches[1].pageY;
                                // Calculate length between touch points with pythagoras
                                // There is no reason to use Math.pow and Math.sqrt as we
                                // only want a relative length and not the exact one.
                                var length = x * x + y * y;

                                // Calculate delta between current position and last position
                                var delta = length - previousPosition.length;

                                // Naive hysteresis
                                if (Math.abs(delta) < 100) {
                                    return;
                                }

                                // Calculate center between touch points
                                var centerX = $event.originalEvent.touches[1].pageX + x / 2;
                                var centerY = $event.originalEvent.touches[1].pageY + y / 2;

                                // Calculate zoom center
                                var clickPoint = {
                                    x: centerX - frameElement.offset().left,
                                    y: centerY - frameElement.offset().top
                                };

                                changeZoomLevel($scope.base.zoomLevel + delta * 0.0001, clickPoint);

                                // Update length for next move event
                                previousPosition = {
                                    length: length
                                };
                            }
                        };


                        $scope.onTouchEnd = function($event) {
                            $scope.onMouseup($event);
                        };

                        $scope.onMousedown = function ($event) {
                            if ($scope.config.panOnClickDrag) {
                                previousPosition = {
                                    x: $event.pageX,
                                    y: $event.pageY
                                };
                                lastMouseEventTime = jQuery.now();
                                $scope.dragging = true;
                                $scope.model.isPanning = false;
                                $document.on('mousemove', $scope.onMousemove);
                                $document.on('mouseup', $scope.onMouseup);
                                $document.on('touchend', $scope.onTouchEnd);
                                $document.on('touchmove', $scope.onTouchMove);
                            }

                            return false;
                        };



                        var pan = function (delta) {
                            delta.x = delta.x || 0;
                            delta.y = delta.y || 0;
                            $scope.base.pan.x += delta.x;
                            $scope.base.pan.y += delta.y;

                            syncModelToDOM();
                        };


                        $scope.onMousemove = function ($event) {
                          $event.preventDefault();
                          $event.stopPropagation();

                            var now = jQuery.now();
                            var timeSinceLastMouseEvent = (now - lastMouseEventTime) / 1000;
                            $scope.hasPanned = true;
                            lastMouseEventTime = now;
                            var dragDelta = {
                                x: $event.pageX - previousPosition.x,
                                y: $event.pageY - previousPosition.y
                            };

                            if ($scope.config.keepInBounds) {
                                var topLeftCornerView = getViewPosition({ x: 0, y: 0 });
                                var bottomRightCornerView = getViewPosition({ x: viewportWidth, y: viewportHeight });

                                if (topLeftCornerView.x > 0 && dragDelta.x > 0) {
                                    dragDelta.x *= Math.min(Math.pow(topLeftCornerView.x, -$scope.config.keepInBoundsDragPullback), 1);
                                }

                                if (topLeftCornerView.y > 0 && dragDelta.y > 0) {
                                    dragDelta.y *= Math.min(Math.pow(topLeftCornerView.y, -$scope.config.keepInBoundsDragPullback), 1);
                                }

                                if (bottomRightCornerView.x < viewportWidth && dragDelta.x < 0) {
                                     dragDelta.x *= Math.min(Math.pow(viewportWidth - bottomRightCornerView.x, -$scope.config.keepInBoundsDragPullback), 1);
                                }

                                if (bottomRightCornerView.y < viewportHeight && dragDelta.y < 0) {
                                     dragDelta.y *= Math.min(Math.pow(viewportHeight - bottomRightCornerView.y, -$scope.config.keepInBoundsDragPullback), 1);
                                }
                            }

                            pan(dragDelta);

                            if (!$scope.model.isPanning) {
                            	//This will improve the performance,
                            	//because the browser stops evaluating hits against the elements displayed inside the pan zoom view.
                            	//Besides this, mouse events will not be sent to any other elements,
                            	//this prevents issues like selecting elements while dragging.
                                $overlay.css('display', 'block');
                            }

                            $scope.model.isPanning = true;


                            // set these for the animation slow down once drag stops
                            $scope.panVelocity = {
                                x: dragDelta.x / timeSinceLastMouseEvent,
                                y: dragDelta.y / timeSinceLastMouseEvent
                            };

                            previousPosition = {
                                x: $event.pageX,
                                y: $event.pageY
                            };
                        };


                        $scope.onMouseup = function () {
                            var now = jQuery.now();
                            var timeSinceLastMouseEvent = (now - lastMouseEventTime) / 1000;

                            if ($scope.panVelocity) {
                                // apply strong initial dampening if the mouse up occured much later than
                                // the last mouse move, indicating that the mouse hasn't moved recently
                                // TBD experiment with this formula
                                var initialMultiplier = Math.max(0, Math.pow(timeSinceLastMouseEvent + 1, -4) - 0.2);

                                $scope.panVelocity.x *= initialMultiplier;
                                $scope.panVelocity.y *= initialMultiplier;
                            }

                            $scope.dragging = false;
                            $scope.model.isPanning = false;

                            $document.off('mousemove', $scope.onMousemove);
                            $document.off('mouseup', $scope.onMouseup);
                            $document.off('touchend', $scope.onTouchEnd);
                            $document.off('touchmove', $scope.onTouchMove);

                            //Set the overlay to noneblocking again:
                            $overlay.css('display', 'none');
                        };

                        $scope.onMouseleave = function () {
                            $scope.onMouseup(); // same behaviour
                        };


                        $scope.onMouseWheel = function ($event, $delta, $deltaX, $deltaY) {
                            if ($scope.config.zoomOnMouseWheel) {
                                $event.preventDefault();

                                if ($scope.zoomAnimation) {
                                    return; // already zooming
                                }

                                var sign = $deltaY / Math.abs($deltaY);

                                if ($scope.config.invertMouseWheel) {
                                    sign = -sign;
                                }

                                var clickPoint = {
                                    x: $event.originalEvent.pageX - frameElement.offset().left,
                                    y: $event.originalEvent.pageY - frameElement.offset().top
                                };

                                if (sign < 0) {
                                    zoomIn(clickPoint);
                                } else if (sign > 0) {
                                    zoomOut(clickPoint);
                                }
                            }
                        };


                        // create public API
                        api = {
                            model: $scope.model,
                            config: $scope.config,
                            changeZoomLevel: changeZoomLevel,
                            zoomIn: zoomIn,
                            zoomOut: zoomOut,
                            zoomToFit: zoomToFit,
                            getViewPosition: getViewPosition,
                            getModelPosition: getModelPosition
                        };

        }],

                link: function (scope, element, attrs) {
                    scope.elementId = attrs.id;

                    viewportHeight = element.find('.zoom-element').children().height();
                    viewportWidth = element.find('.zoom-element').children().width();

                    if (scope.elementId) {
                        this.panZoomService.registerAPI(scope.elementId, api);
                    }


                    element.on('touchstart', function(e) {
                    	scope.onTouchStart(e);
                    });
                },
                template: '<div class="pan-zoom-frame" ng-dblclick="onDblClick($event)" ng-mousedown="onMousedown($event)"' +
                    ' msd-wheel="onMouseWheel($event, $delta, $deltaX, $deltaY)"' +
                    ' style="position:relative;overflow:hidden;cursor:move">' +
                    '<div class="pan-element" style="position:absolute;left:0px;top:0px">' +
                    '<div class="zoom-element" ng-transclude>' +
                    '</div>' +
                    '</div>' +
                    '</div>',

                replace: true
            };
    }]);
*/  //MIGRATED

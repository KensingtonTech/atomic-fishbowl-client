import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Rect } from './panzoom-rect';
import { PanZoomModel } from './panzoom-model';
import { PanZoomAPI } from './panzoom-api';
declare var log: any;

export class PanZoomConfig {

  chromeUseTransform: boolean;
  disableZoomAnimation: boolean;
  friction: number;
  haltSpeed: number;
  initialPanX: number;
  initialPanY: number;

  neutralZoomLevel: number;
  initialZoomLevel: number; // defaults to the value of neutralZoomLevel
  zoomLevels: number;
  scalePerZoomLevel: number;
  zoomToFitZoomLevelFactor: number;

  initialZoomToFit: Rect;
  invertMouseWheel: boolean;
  keepInBounds: boolean;
  keepInBoundsDragPullback: number;
  keepInBoundsRestoreForce: number;
  panOnClickDrag: boolean;
  useHardwareAcceleration: boolean;
  zoomButtonIncrement: number;
  zoomOnDoubleClick: boolean;
  zoomOnMouseWheel: boolean;
  zoomStepDuration: number;
  modelChanged: Subject<PanZoomModel> = new Subject<PanZoomModel>();
  newApi: BehaviorSubject<PanZoomAPI> = new BehaviorSubject<PanZoomAPI>( {
    model: null,
    config: null,
    changeZoomLevel: null,
    zoomIn: null,
    zoomOut: null,
    zoomToFit: null,
    getViewPosition: null,
    getModelPosition: null
  });
  freeMouseWheel: boolean;
  freeMouseWheelFactor: number; // mouse wheel conversion factor for free zoom.  1 = max

  constructor() {
    // log.debug("Initializing PanZoomConfigService");
    // initialize defaults
    // initialize models. Use passed properties when available, otherwise revert to defaults
    // NOTE: all times specified in seconds, all distances specified in pixels
    this.disableZoomAnimation = this.disableZoomAnimation !== undefined ? this.disableZoomAnimation : false;
    this.zoomLevels = this.zoomLevels !== undefined ? this.zoomLevels : 5;
    this.neutralZoomLevel = this.neutralZoomLevel !== undefined ? this.neutralZoomLevel : 2;
    this.initialZoomLevel = this.initialZoomLevel !== undefined ? this.initialZoomLevel : this.neutralZoomLevel;

    this.friction = this.friction !== undefined ? this.friction : 10.0;
    this.haltSpeed = this.haltSpeed !== undefined ? this.haltSpeed : 100.0;
    this.scalePerZoomLevel = this.scalePerZoomLevel !== undefined ? this.scalePerZoomLevel : 2;

    this.zoomStepDuration = this.zoomStepDuration !== undefined ? this.zoomStepDuration : 0.2;
    this.zoomToFitZoomLevelFactor = this.zoomToFitZoomLevelFactor !== undefined ? this.zoomToFitZoomLevelFactor : 0.95;
    this.zoomButtonIncrement = this.zoomButtonIncrement !== undefined ? this.zoomButtonIncrement : 1.0;

    this.useHardwareAcceleration = this.useHardwareAcceleration !== undefined ? this.useHardwareAcceleration : false;
    this.chromeUseTransform = this.chromeUseTransform ? this.chromeUseTransform : false;

    this.initialPanX = this.initialPanX !== undefined ? this.initialPanX  : 0;
    this.initialPanY = this.initialPanY || 0;
    this.keepInBounds = this.keepInBounds ? this.keepInBounds : false;
    if (this.keepInBounds && this.neutralZoomLevel !== 0) {
      log.warn('You have set keepInBounds to true and neutralZoomLevel to ' + this.neutralZoomLevel +
        '. Be aware that the zoom level cannot below ' + this.neutralZoomLevel);
    }
    this.keepInBoundsRestoreForce = this.keepInBoundsRestoreForce !== undefined ? this.keepInBoundsRestoreForce : 0.5;
    this.keepInBoundsDragPullback = this.keepInBoundsDragPullback !== undefined ? this.keepInBoundsDragPullback : 0.7;

    this.zoomOnDoubleClick = this.zoomOnDoubleClick !== undefined ? this.zoomOnDoubleClick : true;
    this.zoomOnMouseWheel = this.zoomOnMouseWheel !== undefined ? this.zoomOnMouseWheel : true;
    this.panOnClickDrag = this.panOnClickDrag !== undefined ? this.panOnClickDrag : true;

    this.invertMouseWheel = this.invertMouseWheel !== undefined ? this.invertMouseWheel : false;

    this.freeMouseWheel = this.freeMouseWheel !== undefined ? this.freeMouseWheel : false;
    this.freeMouseWheelFactor = this.freeMouseWheelFactor !== undefined ? this.freeMouseWheelFactor : 0.08;
  }
}


/*
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
declare var log: any;

export class PanZoomConfig {

  chromeUseTransform = false;
  disableZoomAnimation = true;
  friction = 10;
  haltSpeed: 100;
  initialPanX = 0;
  initialPanY: number;
  initialZoomToFit: any; // is type rectangle but typescript doesn't know about this
  invertMouseWheel = false;
  keepInBounds = false;
  keepInBoundsDragPullback = 0.7;
  keepInBoundsRestoreForce = 0.5;
  neutralZoomLevel = 2;
  initialZoomLevel = this.neutralZoomLevel;
  panOnClickDrag = true;
  scalePerZoomLevel = 2;
  useHardwareAcceleration = false;
  zoomButtonIncrement = 1;
  zoomLevels = 5;
  zoomOnDoubleClick = true;
  zoomOnMouseWheel = true;
  zoomStepDuration = 0.2;
  zoomToFitZoomLevelFactor: 0.95;
  modelChanged: Subject<any> = new Subject<any>();
  newApi: BehaviorSubject<any> = new BehaviorSubject<any>({});
  freeMouseWheel: boolean;
  freeMouseWheelFactor: number;

  constructor() {
    // log.debug("Initializing PanZoomConfigService");
    // initialize defaults
    // initialize models. Use passed properties when available, otherwise revert to defaults
    // NOTE: all times specified in seconds, all distances specified in pixels

    // this.disableZoomAnimation = this.disableZoomAnimation !== undefined ? this.disableZoomAnimation : false;
    // this.zoomLevels = this.zoomLevels !== undefined ? this.zoomLevels : 5;
    // this.neutralZoomLevel = this.neutralZoomLevel !== undefined ? this.neutralZoomLevel : 2;
    // this.friction = this.friction !== undefined ? this.friction : 10.0;
    // this.haltSpeed = this.haltSpeed !== undefined ? this.haltSpeed : 100.0;
    // this.scalePerZoomLevel = this.scalePerZoomLevel !== undefined ? this.scalePerZoomLevel : 2;

    // this.zoomStepDuration = this.zoomStepDuration !== undefined ? this.zoomStepDuration : 0.2;
    // this.zoomToFitZoomLevelFactor = this.zoomToFitZoomLevelFactor !== undefined ? this.zoomToFitZoomLevelFactor : 0.95;
    // this.zoomButtonIncrement = this.zoomButtonIncrement !== undefined ? this.zoomButtonIncrement : 1.0;
    // this.useHardwareAcceleration = this.useHardwareAcceleration !== undefined ? this.useHardwareAcceleration : false;

    // this.initialZoomLevel = this.initialZoomLevel !== undefined ? this.initialZoomLevel : this.neutralZoomLevel;
    // this.initialPanX = this.initialPanX !== undefined ? this.initialPanX  : 0;
    this.initialPanY = this.initialPanY || 0;
    // this.keepInBounds = this.keepInBounds ? this.keepInBounds : false;
    if (this.keepInBounds && this.neutralZoomLevel !== 0) {
      log.warn('You have set keepInBounds to true and neutralZoomLevel to ' + this.neutralZoomLevel +
        '. Be aware that the zoom level cannot go below ' + this.neutralZoomLevel);
    }
    // this.keepInBoundsRestoreForce = this.keepInBoundsRestoreForce !== undefined ? this.keepInBoundsRestoreForce : 0.5;
    // this.keepInBoundsDragPullback = this.keepInBoundsDragPullback !== undefined ? this.keepInBoundsDragPullback : 0.7;

    // this.zoomOnDoubleClick = this.zoomOnDoubleClick !== undefined ? this.zoomOnDoubleClick : true;
    // this.zoomOnMouseWheel = this.zoomOnMouseWheel !== undefined ? this.zoomOnMouseWheel : true;
    // this.panOnClickDrag = this.panOnClickDrag !== undefined ? this.panOnClickDrag : true;

    // this.invertMouseWheel = this.invertMouseWheel !== undefined ? this.invertMouseWheel : false;

    // this.chromeUseTransform = this.chromeUseTransform ? this.chromeUseTransform : false;
  }
}
*/
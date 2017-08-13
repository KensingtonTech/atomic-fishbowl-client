import { Injectable } from '@angular/core';
// import 'rxjs/add/operator/toPromise';
declare var log: any;

@Injectable()

export class PanZoomConfigService {

  chromeUseTransform: boolean;
  disableZoomAnimation: boolean;
  friction: number;
  haltSpeed: number;
  initialPanX: number;
  initialPanY: number;
  initialZoomLevel: number;
  initialZoomToFit: any; // is type rectangle but typescript doesn't know about this
  invertMouseWheel: boolean;
  keepInBounds: boolean;
  keepInBoundsDragPullback: number;
  keepInBoundsRestoreForce: number;
  modelChangedCallback: Function;
  neutralZoomLevel: number;
  panOnClickDrag: boolean;
  scalePerZoomLevel: number;
  useHardwareAcceleration: boolean;
  zoomButtonIncrement: number;
  zoomLevels: number;
  zoomOnDoubleClick: boolean;
  zoomOnMouseWheel: boolean;
  zoomStepDuration: number;
  zoomToFitZoomLevelFactor: number;

  model = {};

  constructor() {
    // console.log("Initializing PanZoomConfigService");
    // initialize defaults
    // initialize models. Use passed properties when available, otherwise revert to defaults
    // NOTE: all times specified in seconds, all distances specified in pixels
    this.disableZoomAnimation = this.disableZoomAnimation !== undefined ? this.disableZoomAnimation : false;
    this.zoomLevels = this.zoomLevels !== undefined ? this.zoomLevels : 5;
    this.neutralZoomLevel = this.neutralZoomLevel !== undefined ? this.neutralZoomLevel : 2;
    this.friction = this.friction !== undefined ? this.friction : 10.0;
    this.haltSpeed = this.haltSpeed !== undefined ? this.haltSpeed : 100.0;
    this.scalePerZoomLevel = this.scalePerZoomLevel !== undefined ? this.scalePerZoomLevel : 2;

    this.zoomStepDuration = this.zoomStepDuration !== undefined ? this.zoomStepDuration : 0.2;
    this.zoomToFitZoomLevelFactor = this.zoomToFitZoomLevelFactor !== undefined ? this.zoomToFitZoomLevelFactor : 0.95;
    this.zoomButtonIncrement = this.zoomButtonIncrement !== undefined ? this.zoomButtonIncrement : 1.0;
    this.useHardwareAcceleration = this.useHardwareAcceleration !== undefined ? this.useHardwareAcceleration : false;

    this.initialZoomLevel = this.initialZoomLevel !== undefined ? this.initialZoomLevel : this.neutralZoomLevel;
    this.initialPanX = this.initialPanX !== undefined ? this.initialPanX  : 0;
    this.initialPanY = this.initialPanY || 0;
    this.keepInBounds = this.keepInBounds ? this.keepInBounds : false;
    if (this.keepInBounds && this.neutralZoomLevel !== 0) {
      console.warn('You have set keepInBounds to true and neutralZoomLevel to ' + this.neutralZoomLevel +
        '. Be aware that the zoom level cannot below ' + this.neutralZoomLevel);
    }
    this.keepInBoundsRestoreForce = this.keepInBoundsRestoreForce !== undefined ? this.keepInBoundsRestoreForce : 0.5;
    this.keepInBoundsDragPullback = this.keepInBoundsDragPullback !== undefined ? this.keepInBoundsDragPullback : 0.7;

    this.zoomOnDoubleClick = this.zoomOnDoubleClick !== undefined ? this.zoomOnDoubleClick : true;
    this.zoomOnMouseWheel = this.zoomOnMouseWheel !== undefined ? this.zoomOnMouseWheel : true;
    this.panOnClickDrag = this.panOnClickDrag !== undefined ? this.panOnClickDrag : true;

    this.invertMouseWheel = this.invertMouseWheel !== undefined ? this.invertMouseWheel : false;

    this.chromeUseTransform = this.chromeUseTransform ? this.chromeUseTransform : false;
  }
}

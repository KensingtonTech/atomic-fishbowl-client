import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Rect } from './panzoom-rect';
import { PanZoomModel } from './panzoom-model';
import { PanZoomAPI } from './panzoom-api';
import * as log from 'loglevel';

export class PanZoomConfig {

  chromeUseTransform = true;
  disableZoomAnimation = false;
  friction = 10.0;
  haltSpeed = 100.0;
  initialPanX = 0;
  initialPanY = 0;
  initialZoomToFit: Rect;
  invertMouseWheel = false;
  keepInBounds = false;
  keepInBoundsDragPullback = 0.7;
  keepInBoundsRestoreForce = 0.5;
  neutralZoomLevel = 2;
  initialZoomLevel = this.neutralZoomLevel;
  panOnClickDrag = true;
  scalePerZoomLevel = 2;
  useHardwareAcceleration = false;
  zoomButtonIncrement = 1.0;
  zoomLevels = 5;
  zoomOnDoubleClick = true;
  zoomOnMouseWheel = true;
  zoomStepDuration = 0.2;
  zoomToFitZoomLevelFactor = 0.95;
  modelChanged: Subject<PanZoomModel> = new Subject<PanZoomModel>();
  newApi: BehaviorSubject<PanZoomAPI> = new BehaviorSubject<PanZoomAPI>({
    model: null,
    config: null,
    changeZoomLevel: null,
    zoomIn: null,
    zoomOut: null,
    zoomToFit: null,
    getViewPosition: null,
    getModelPosition: null
  });
  freeMouseWheel = false;
  freeMouseWheelFactor = 0.08;

  constructor() {
    if (this.keepInBounds && this.neutralZoomLevel !== 0) {
      log.warn('You have set keepInBounds to true and neutralZoomLevel to ' + this.neutralZoomLevel + '. Be aware that the zoom level cannot go below ' + this.neutralZoomLevel);
    }
  }
}

import { PanZoomModel } from './panzoom-model';
import { PanZoomConfig } from './panzoom-config';

export interface PanZoomAPI {
  model: PanZoomModel;
  config: PanZoomConfig;
  changeZoomLevel: Function;
  zoomIn: Function;
  zoomOut: Function;
  zoomToFit: Function;
  getViewPosition: Function;
  getModelPosition: Function;
}

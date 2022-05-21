import { Subject, BehaviorSubject } from 'rxjs';
import { IsotopeAPI } from './isotope-api';
import * as utils from '../utils';
/**
 * IsotopeOption
 */

export interface MasonryOption {
  columnWidth?: number | string;
  gutter?: number;
  horizontalOrder?: boolean;
  fitWidth?: boolean;
}



export interface PackeryOption {
  gutter: number;
}



export interface IsotopeConfigOptions {
  layoutMode?: string;
  itemSelector?: string;
  masonry: MasonryOption;
  packery?: PackeryOption;
  percentPosition?: boolean;
  stamp?: string;
  originLeft?: boolean;
  originTop?: boolean;
  containerStyle?: string;
  transitionDuration?: string;
  resize?: boolean;
  initLayout?: boolean;
}



export class IsotopeConfig implements IsotopeConfigOptions {
  layoutMode = 'masonry';
  itemSelector?: string;
  masonry: MasonryOption;
  packery?: PackeryOption;
  percentPosition?: boolean;
  stamp?: string;
  originLeft = true;
  originTop = true;
  containerStyle?: string;
  transitionDuration?: string;
  resize?: boolean;
  initLayout = true;
  initialized = new BehaviorSubject<boolean>(false);
  api = new BehaviorSubject<IsotopeAPI>({
    layout: utils.noop,
    destroyMe: utils.noop,
    initializeMe: utils.noop,
    unhideAll: utils.noop,
    basicLayout: utils.noop,
    reloadItems: utils.noop
  });



  constructor( options?: IsotopeConfigOptions ) {
    if (!options) {
      return;
    }

    if (options.layoutMode) {
      this.layoutMode = options.layoutMode;
    }

    if (options.itemSelector) {
      this.itemSelector = options.itemSelector;
    }

    if (options.masonry) {
      this.masonry = options.masonry;
    }

    if (options.packery) {
      this.packery = options.packery;
    }

    if (options.percentPosition !== undefined) {
      this.percentPosition = options.percentPosition;
    }

    if (options.stamp) {
      this.stamp = options.stamp;
    }

    if (options.originLeft !== undefined) {
      this.originLeft = options.originLeft;
    }

    if (options.originTop !== undefined) {
      this.originTop = options.originTop;
    }

    if (options.containerStyle) {
      this.containerStyle = options.containerStyle;
    }

    if (options.transitionDuration !== undefined) {
      this.transitionDuration = options.transitionDuration;
    }

    if (options.resize !== undefined) {
      this.resize = options.resize;
    }

    if (options.initLayout !== undefined) {
      this.initLayout = options.initLayout;
    }
  }



  copy(): IsotopeConfig {
    const newOption = new IsotopeConfig();
    if (this.itemSelector) {
      newOption.itemSelector = this.itemSelector;
    }
    if (this.masonry) {
      newOption.masonry = this.masonry;
    }
    if (this.packery) {
      newOption.packery = this.packery;
    }
    if (this.percentPosition) {
      newOption.percentPosition = this.percentPosition;
    }
    if (this.stamp) {
      newOption.stamp = this.stamp;
    }
    if (this.originLeft !== null) {
      newOption.originLeft = this.originLeft;
    }
    if (this.originTop !== null) {
      newOption.originTop = this.originTop;
    }
    if (this.containerStyle) {
      newOption.containerStyle = this.containerStyle;
    }
    if (this.transitionDuration) {
      newOption.transitionDuration = this.transitionDuration;
    }
    if (this.resize !== null) {
      newOption.resize = this.resize;
    }
    if (this.initLayout !== null) {
      newOption.initLayout = this.initLayout;
    }
    newOption.layoutMode = this.layoutMode;
    newOption.initialized = this.initialized;
    newOption.api = this.api;
    return newOption;
  }

}

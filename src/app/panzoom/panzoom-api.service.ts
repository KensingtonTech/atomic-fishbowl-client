import { Injectable } from '@angular/core';
import { Deferred } from './deferred';

@Injectable()

export class PanZoomApiService {

  overlayEnabled: boolean = false;
  panZoomAPIs = {};

  registerAPI(key: string, panZoomAPI: any): void {
    console.log("registerAPI()");

    if (!this.panZoomAPIs[key]) {
      this.panZoomAPIs[key] = new Deferred<any>();
    }

    var deferred: Deferred<any> = this.panZoomAPIs[key];

    if (deferred.hasBeenResolved) {
      throw 'Internal error: attempt to register a panzoom API but key was already used. Did you declare two <panzoom> directives with the same id?';
    }
    else {
      deferred.resolve(panZoomAPI);
      deferred.hasBeenResolved = true;
    }
  }

  unregisterAPI(key: string) {
    delete this.panZoomAPIs[key];
  };

  getAPI(key: string) {
    if (!this.panZoomAPIs[key]) {
      this.panZoomAPIs[key] = new Deferred<any>();
    }

    return this.panZoomAPIs[key].promise;
  };

}

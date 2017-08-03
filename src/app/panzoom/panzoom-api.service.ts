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


/*
angular.module('panzoom').factory('PanZoomService', ['$q',
    function ($q) {
        // key -> deferred with promise of API
        var panZoomAPIs = {};

        var registerAPI = function (key, panZoomAPI) {
            if (!panZoomAPIs[key]) {
                panZoomAPIs[key] = $q.defer();
            }

            var deferred = panZoomAPIs[key];
            if (deferred.hasBeenResolved) {
                throw 'Internal error: attempt to register a panzoom API but key was already used. Did you declare two <panzoom> directives with the same id?';
            }
            else {
                deferred.resolve(panZoomAPI);
                deferred.hasBeenResolved = true;
            }
        };

        var unregisterAPI = function (key) {
            delete panZoomAPIs[key];
        };

        // this method returns a promise since it's entirely possible that it's called before the <panzoom> directive registered the API
        var getAPI = function (key) {
            if (!panZoomAPIs[key]) {
                panZoomAPIs[key] = $q.defer();
            }

            return panZoomAPIs[key].promise;
        };

        return {
            registerAPI: registerAPI,
            unregisterAPI: unregisterAPI,
            getAPI: getAPI
        };
}]);
*/

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToolService } from './tool.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription} from 'rxjs';
declare var log;

@Component({
  selector: 'default-route',
  template: ''
})

export class DefaultRouteComponent implements OnInit, OnDestroy {

  constructor(
    private toolService: ToolService,
    private route: ActivatedRoute,
    private router: Router ) {}

  private defaultView = 'masonryGrid';

  private routeParametersSubscription: Subscription;

  ngOnInit(): void {
    // https://localhost/adhoc;query=abcd
    // https://localhost/adhoc/abcd
    // https://localhost/adhoc?query=abcd
    // https://localhost?query=abcd&something=somethingelse
    log.debug('DefaultRouteComponent: ngOnInit()');
    this.routeParametersSubscription = this.route.queryParamMap.subscribe( params => this.onRouteParameters(params) );
    // log.debug('DefaultRouteComponent: ngOnInit(): params:', this.route.snapshot.queryParams);
  }

  ngOnDestroy(): void {
    this.routeParametersSubscription.unsubscribe();
  }

  private onRouteParameters(p: any): void {
    log.debug('DefaultRouteComponent: onRouteParameters(): params:', p);

    let params = {};

    if (Object.keys(p.params).length !== 0) {
      params = p.params;
    }



    /*let view = this.toolService.getPreference('defaultView');
    if (view) {
      log.debug('DefaultRouteComponent: onRouteParameters(): routing to defaultView preference ' + view + ' with query params:', params);
      this.router.navigate([view], { queryParams: params, queryParamsHandling: 'merge' } );
    }*/

    if (this.toolService.lastRoute) {
      log.debug('DefaultRouteComponent: routing to lastRoute ' + this.toolService.lastRoute + ' with query params:', params);
      this.router.navigate([this.toolService.lastRoute], { queryParams: params, queryParamsHandling: 'merge' });
      return;
    }

    else {
      // default route
      log.debug('DefaultRouteComponent: onRouteParameters(): routing to default route ' + this.defaultView + ' with query params:', params);
      this.router.navigate([this.defaultView], { queryParams: params, queryParamsHandling: 'merge' } );
    }

  }

}

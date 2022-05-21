import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { ToolService } from 'services/tool.service';
import { Subscription} from 'rxjs';
import * as log from 'loglevel';

@Component({
  selector: 'app-default-route',
  template: ''
})

export class DefaultRouteComponent implements OnInit, OnDestroy {

  // the job of this service is to decide which application route to take (i.e. /masonryGrid or /classicGrid) if no route is specified
  // it will redirect the browser to the appropriate route
  // it will pass along all url parameters to the route it decides to take

  constructor(
    private toolService: ToolService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  private defaultRoute = 'masonryGrid';
  private subscriptions = new Subscription();



  ngOnInit(): void {
    // https://localhost/adhoc;query=abcd
    // https://localhost/adhoc/abcd
    // https://localhost/adhoc?query=abcd
    // https://localhost?query=abcd&something=somethingelse
    log.debug('DefaultRouteComponent: ngOnInit()');
    this.subscriptions.add(
      this.route.queryParams.subscribe(
        (params: Params ) => this.onRouteParameters(params)
      )
    );
  }



  ngOnDestroy(): void {
    log.debug('DefaultRouteComponent: ngOnDestroy()');
    this.subscriptions.unsubscribe();
  }



  private onRouteParameters(params: Params): void {
    log.debug('DefaultRouteComponent: onRouteParameters(): params:', params);

    if (this.toolService.lastRoute) {
      log.debug('DefaultRouteComponent: routing to lastRoute ' + this.toolService.lastRoute + ' with query params:', params);
      this.router.navigate([this.toolService.lastRoute]);
      return;
    }

    else {
      // default route
      log.debug('DefaultRouteComponent: onRouteParameters(): routing to default route ' + this.defaultRoute + ' with query params:', params);
      this.router.navigate([this.defaultRoute]);
    }

  }

}

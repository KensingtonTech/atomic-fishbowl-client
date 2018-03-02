import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToolService } from './tool.service';
declare var log;

@Component({
  selector: 'router-dropdown',
  template: `
<div (clickOutside)="collapseRouterOptions()" *ngIf="selectedRoute" style="position: relative; display: block; z-index: 101;" class="noselect routerDropdownBody">
  <div *ngIf="!selectionExpanded">
    <i (click)="expandRouterOptions()" class="{{selectedRoute.class}}"></i><br>
  </div>
  <div *ngIf="selectionExpanded">
    <div *ngFor="let option of routerOptions" style="margin-bottom: 2px;">
      <i (click)="routeSelected(option)" class="{{option.class}}" pTooltip="{{option.tooltip}}" tooltipPosition="right"></i>
    </div>
  </div>
</div>
  `,
  styles: [`
    .icon {
      background-color: rgb(75,173,243);
      color: white;
      border-radius: 10px;
      padding: 3px;
    }
  `],
})

export class RouterDropdownComponent implements OnInit {

  constructor(private router: Router,
              private toolService: ToolService,
              private changeDetectorRef: ChangeDetectorRef,
              private el: ElementRef ) {}

  private routerOptions: any =  [
                                  { name: 'masonryGrid', link: '/masonryGrid', class: 'icon fa fa-th-large fa-2x fa-fw', tooltip: 'Masonry Grid' },
                                  { name: 'classicGrid', link: '/classicGrid', class: 'icon fa fa-th fa-2x fa-fw', tooltip: 'Classic Grid' }
                                ];
  public selectedRoute: any;
  private selectionExpanded = false;

  ngOnInit(): void {
    this.selectedRoute  = this.getSelectedRoute();
  }

  getSelectedRoute(): any {
    let route = this.router.url;
    for ( let i = 0; i < this.routerOptions.length; i++ ) {
      if (this.routerOptions[i].link === route) {
        return this.routerOptions[i];
      }
    }
  }

  collapseRouterOptions(): void {
    // log.debug('collapseRouterOptions()');
    // document.removeEventListener('click', () => this.collapseRouterOptions() );
    this.selectionExpanded = false;
  }

  expandRouterOptions(): void {
    // log.debug("expandRouterOptions()");
    setTimeout( () => {
      this.selectionExpanded = true;
      // this.changeDetectorRef.detectChanges();
      this.changeDetectorRef.markForCheck();
    }, 10);
  }

  routeSelected(e: any): void {
    // log.debug("routeSelected()", e);
    if (this.selectedRoute !== e) {
      this.selectedRoute = e;
      this.selectionExpanded = false;
      // execute route
      this.router.navigate([e.link]);
      this.changeDetectorRef.markForCheck();
      this.toolService.loadCollectionOnRouteChange = true;
    }
    else {
      this.collapseRouterOptions();
    }
  }

}

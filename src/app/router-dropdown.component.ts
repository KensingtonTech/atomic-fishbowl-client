import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToolService } from './tool.service';
declare var log: any;
// import * as $ from 'jquery';
// declare var $: any;

@Component({
  selector: 'router-dropdown',
  template: `
<div (clickOutside)="collapseRouterOptions()" *ngIf="selectedRoute" style="position: relative; display: block; z-index: 101;" class="noselect routerDropdownBody">
  <div *ngIf="!selectionExpanded">
    <i (click)="expandRouterOptions()" class="{{selectedRoute.class}}"></i><br>
  </div>
  <div *ngIf="selectionExpanded">
    <div *ngFor="let o of routerOptions" style="margin-bottom: 2px;">
      <i (click)="routeSelected(o)" class="{{o.class}}" pTooltip="{{o.tooltip}}" tooltipPosition="right"></i>
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
    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }
  `],
})

export class RouterDropdownComponent implements OnInit {

  constructor(private router: Router,
              private toolService: ToolService,
              private changeDetectorRef: ChangeDetectorRef,
              private el: ElementRef ) {}

  private routerOptions: any =  [
                                  { name: 'classicGrid', link: '/classicGrid', class: 'icon fa fa-th fa-2x fa-fw', tooltip: "Classic Grid" },
                                  { name: 'masonryGrid', link: '/masonryGrid', class: 'icon fa fa-th-large fa-2x fa-fw', tooltip: "Masonry Grid" }
                                ];
  public selectedRoute: any;
  private selectionExpanded: boolean = false;

  ngOnInit(): void {
    this.selectedRoute  = this.getSelectedRoute();
  }

  getSelectedRoute(): any {
    var route = this.router.url;
    for ( let i = 0; i < this.routerOptions.length; i++ ) {
      if (this.routerOptions[i].link === route) {
        return this.routerOptions[i];
      }
    }
  }

  collapseRouterOptions(): void {
    //log.debug('collapseRouterOptions()');
    //document.removeEventListener('click', () => this.collapseRouterOptions() );
    this.selectionExpanded = false;
  }

  expandRouterOptions(): void {
    //log.debug("expandRouterOptions()");
    setTimeout( () => { this.selectionExpanded = true;
                        //this.changeDetectorRef.detectChanges();
                        this.changeDetectorRef.markForCheck();
                      }, 10);
  }

  routeSelected(e: any): void {
    //log.debug("routeSelected()", e);
    if (this.selectedRoute !== e) {
      this.selectedRoute = e;
      this.selectionExpanded = false;
      //execute route
      this.router.navigate([e.link]);
      this.changeDetectorRef.markForCheck();
      this.toolService.getCollectionDataAgain.next();
    }
    else {
      this.collapseRouterOptions();
    }
  }

}

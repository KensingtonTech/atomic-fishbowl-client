import { Component, ChangeDetectorRef, OnInit, ElementRef, Output, EventEmitter, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToolService } from 'services/tool.service';
import { Logger } from 'loglevel';
declare var log: Logger;

interface RouterOption {
  name: string;
  link: string;
  class: string;
  tooltip: string;
}

@Component({
  selector: 'router-dropdown',
  template: `
<ng-container *ngIf="selectedRoute">

  <!-- collapsed -->
  <span *ngIf="!selectionExpanded" (click)="expandRouterOptions()" [ngClass]="selectedRoute.class" class="routerIcon"></span>

  <!-- expanded -->
  <div *ngIf="selectionExpanded" (clickOutside)="collapseRouterOptions()">
    <div *ngFor="let option of routerOptions" style="margin-bottom: .2em" (click)="routeSelected(option)">
      <span class="routerIcon {{option.class}}" [class.deselect]="selectedRoute.name == option.name"></span>&nbsp;<span style="color: white; vertical-align: 50%;">{{option.tooltip}}</span>
    </div>
  </div>

</ng-container>
  `,
  styles: [ ],
})

export class RouterDropdownComponent implements OnInit {

  constructor(private router: Router,
              private toolService: ToolService,
              private changeDetectorRef: ChangeDetectorRef,
              private el: ElementRef,
              private zone: NgZone ) { }

  private routerOptions: RouterOption[] = [
                                            {
                                              name: 'masonryGrid',
                                              link: '/masonryGrid',
                                              class: 'icon fa fa-th-large fa-2x fa-fw',
                                              tooltip: 'Masonry'
                                            },
                                            {
                                              name: 'classicGrid',
                                              link: '/classicGrid',
                                              class: 'icon fa fa-th fa-2x fa-fw',
                                              tooltip: 'Classic'
                                            }
                                          ];

  @Output() isOpen = new EventEmitter<boolean>();
  public selectedRoute: RouterOption;
  public selectionExpanded = false;



  ngOnInit(): void {
    this.selectedRoute  = this.getSelectedRoute();
    this.orderRouterOptions();
  }



  orderRouterOptions(): void {
    // this will place the currently selected route last in the selection
    let optionToSplice: RouterOption = null;
    for (let i = 0; i < this.routerOptions.length; i++) {
      let option = this.routerOptions[i];
      if (option.name === this.selectedRoute.name) {
        optionToSplice = this.routerOptions[i];
        this.routerOptions.splice(i, 1);
        this.routerOptions.push(optionToSplice);
      }
    }
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
    log.debug('RouterDropdownComponent: collapseRouterOptions()');
    // document.removeEventListener('click', () => this.collapseRouterOptions() );
    this.selectionExpanded = false;
    this.isOpen.emit(false);
  }



  expandRouterOptions(): void {
    log.debug('RouterDropdownComponent: expandRouterOptions()');
    this.selectionExpanded = true;
    // this.changeDetectorRef.markForCheck();
    this.isOpen.emit(true);
    // this.changeDetectorRef.detectChanges();

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

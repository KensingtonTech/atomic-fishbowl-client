import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, ElementRef, Output, EventEmitter, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { ToolService } from './tool.service';
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
<div *ngIf="selectedRoute" style="position: relative; display: block; z-index: 101;" class="noselect routerDropdownBody">
  <div *ngIf="!selectionExpanded">
    <i (click)="expandRouterOptions()" class="routerIcon {{selectedRoute.class}}"></i><br>
  </div>
  <div *ngIf="selectionExpanded" (clickOutside)="collapseRouterOptions()" style="width: 100px;">
    <div *ngFor="let option of routerOptions" style="margin-bottom: 2px;" (click)="routeSelected(option)">
      <i class="routerIcon {{option.class}}" [class.deselect]="selectedRoute.name == option.name"></i>&nbsp;<span style="color: white; vertical-align: 50%;">{{option.tooltip}}</span>
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

    .deselect {
      color: grey;
    }
  `],
})

export class RouterDropdownComponent implements OnInit {

  constructor(private router: Router,
              private toolService: ToolService,
              private changeDetectorRef: ChangeDetectorRef,
              private el: ElementRef ) { }

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

import { Component, ChangeDetectorRef, OnInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { ToolService } from 'services/tool.service';
import * as log from 'loglevel';

interface RouterOption {
  name: string;
  link: string;
  class: string;
  tooltip: string;
}

@Component({
  selector: 'router-dropdown',
  templateUrl: './controlbar-router-dropdown.component.html'
})

export class RouterDropdownComponent implements OnInit {

  constructor(private router: Router,
              private toolService: ToolService,
              private changeDetectorRef: ChangeDetectorRef) {}

  routerOptions: RouterOption[] = [
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
  selectedRoute: RouterOption;
  selectionExpanded = false;



  ngOnInit(): void {
    this.selectedRoute  = this.getSelectedRoute();
    this.orderRouterOptions();
  }



  orderRouterOptions(): void {
    // this will place the currently selected route last in the selection
    let optionToSplice: RouterOption = null;
    for (let i = 0; i < this.routerOptions.length; i++) {
      const option = this.routerOptions[i];
      if (this.selectedRoute.name.startsWith(option.name)) {
        optionToSplice = this.routerOptions[i];
        this.routerOptions.splice(i, 1);
        this.routerOptions.push(optionToSplice);
      }
    }
  }



  getSelectedRoute(): any {
    const route = this.router.url;
    log.debug(`RouterDropdownComponent: getSelectedRoute(): route ${route}`);
    for ( let i = 0; i < this.routerOptions.length; i++ ) {
      if (route.startsWith(this.routerOptions[i].link)) {
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
